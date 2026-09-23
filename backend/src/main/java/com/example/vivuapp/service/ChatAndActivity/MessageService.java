package com.example.vivuapp.service.ChatAndActivity;

import com.example.vivuapp.dto.event.ChatAndActivity.AckEvent;
import com.example.vivuapp.dto.event.ChatAndActivity.ChatMessageEvent;
import com.example.vivuapp.dto.event.ChatAndActivity.TypingEvent;
import com.example.vivuapp.dto.reponse.ChatAndActivity.FileMessageResponse;
import com.example.vivuapp.dto.reponse.ChatAndActivity.MediaAttachmentResponse;
import com.example.vivuapp.dto.reponse.ChatAndActivity.MessageResponse;
import com.example.vivuapp.dto.reponse.ChatAndActivity.MessageSearchResponse;
import com.example.vivuapp.dto.reponse.ChatAndActivity.ReadReceiptResponse;
import com.example.vivuapp.dto.request.ChatAndActivity.ChatSendPayload;
import com.example.vivuapp.dto.request.ChatAndActivity.MessageRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.ChatAndActivity.Conversation;
import com.example.vivuapp.dto.event.MessageEvent;
import com.example.vivuapp.dto.event.ChatAndActivity.MessageReadEvent;
import com.example.vivuapp.entity.ChatAndActivity.Message;
import com.example.vivuapp.entity.ChatAndActivity.MessageAttachment;
import com.example.vivuapp.entity.ChatAndActivity.Participant;
import com.example.vivuapp.entity.Storage.FileEntity;
import com.example.vivuapp.enums.FileCategory;
import com.example.vivuapp.enums.FileType;
import com.example.vivuapp.enums.MessageEventType;
import com.example.vivuapp.enums.MessageType;
import com.example.vivuapp.enums.ParticipantStatus;
import com.example.vivuapp.exception.exceptionImpl.MessageAlreadyDeletedException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vivuapp.repository.ChatAndActivity.ConversationRepository;
import com.example.vivuapp.repository.ChatAndActivity.MessageAttachmentRepository;
import com.example.vivuapp.repository.ChatAndActivity.MessageRepository;
import com.example.vivuapp.repository.ChatAndActivity.ParticipantRepository;
import com.example.vivuapp.service.AccountAndAuthorization.RelationshipService;
import com.example.vivuapp.service.AccountAndAuthorization.UserProfileCacheService;
import com.example.vivuapp.service.File.FileStorageService;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class MessageService {

        MessageRepository messageRepository;
        MessageAttachmentRepository messageAttachmentRepository;
        SimpMessagingTemplate messagingTemplate;
        ConversationRepository conversationRepository;
        ParticipantRepository participantRepository;
        FileStorageService fileStorageService;
        UserProfileRepository userProfileRepository;
        DirectConversationService directConversationService;
        RelationshipService relationshipService;
        UserProfileCacheService userProfileCacheService;

        /**
         * Get sender avatar URL from cache for better performance.
         * Cache is managed by Spring Cache with 5-minute TTL.
         */
        private String getSenderAvatarUrl(Long userId, User user) {
                var cachedInfo = userProfileCacheService.getCachedUserInfo(userId, user);
                return cachedInfo.avatarUrl();
        }

        /**
         * Get sender display name from cache for better performance.
         */
        private String getSenderName(Long userId, User user) {
                var cachedInfo = userProfileCacheService.getCachedUserInfo(userId, user);
                return cachedInfo.displayName();
        }

        /**
         * Legacy method for backwards compatibility.
         * 
         * @deprecated Use getSenderAvatarUrl(Long, User) instead
         */
        @Deprecated
        private String getSenderAvatarUrl(Long userId) {
                return userProfileRepository.findByUserId(userId)
                                .map(com.example.vivuapp.entity.AccountAndAuthorization.UserProfile::getAvatarUrl)
                                .orElse(null);
        }

        /**
         * Legacy method for backwards compatibility.
         * 
         * @deprecated Use getSenderName(Long, User) instead
         */
        @Deprecated
        private String getSenderName(User user) {
                return user.getFirstName() + " " + user.getLastName();
        }

        /**
         * Handle incoming WebSocket message with full routing logic:
         * 1. Check if sender is blocked by recipient
         * 2. Check friendship status
         * 3. Get or create DIRECT conversation
         * 4. Check idempotency (duplicate clientMessageId)
         * 5. Save message and update conversation
         * 6. Route to INBOX or REQUEST based on friendship
         * 7. Send WebSocket events to sender (ACK) and recipient (message)
         *
         * @param sender  The authenticated user sending the message
         * @param payload The message payload from WebSocket
         */
        @Transactional
        public void handleIncomingMessage(User sender, ChatSendPayload payload) {
                Long senderId = sender.getId();
                Long recipientId = payload.getRecipientId();

                log.info("Handling incoming message from {} to {}, clientMessageId={}",
                                senderId, recipientId, payload.getClientMessageId());

                // Step 1 & 2: Get combined relationship flags in single query (optimization)
                var relationshipFlags = relationshipService.getRelationshipFlags(senderId, recipientId);

                // Check if sender is blocked by recipient
                if (relationshipFlags.isBlockedBy()) {
                        log.warn("Message blocked: sender {} is blocked by recipient {}", senderId, recipientId);
                        sendAckToSender(senderId, AckEvent.builder()
                                        .clientMessageId(payload.getClientMessageId())
                                        .status(AckEvent.AckStatus.BLOCKED)
                                        .errorMessage("You cannot message this user")
                                        .build());
                        return;
                }

                boolean areFriends = relationshipFlags.isFriend();
                log.debug("Friendship status between {} and {}: {}", senderId, recipientId, areFriends);

                // Step 3: Get or create DIRECT conversation
                Conversation conversation = directConversationService.getOrCreateForMessage(
                                senderId, recipientId, areFriends);
                boolean isNewConversation = conversation.getLastMessage() == null;

                // Step 4: Check idempotency
                var existingMessage = messageRepository.findByConversationIdAndClientMessageId(
                                conversation.getId(), payload.getClientMessageId());

                if (existingMessage.isPresent()) {
                        log.info("Duplicate message detected: clientMessageId={}", payload.getClientMessageId());
                        Message existing = existingMessage.get();
                        sendAckToSender(senderId, AckEvent.builder()
                                        .clientMessageId(payload.getClientMessageId())
                                        .realMessageId(existing.getId())
                                        .conversationId(conversation.getId())
                                        .status(AckEvent.AckStatus.DUPLICATE)
                                        .build());
                        return;
                }

                // Step 5: Get reply message if specified
                Message replyTo = null;
                if (payload.getReplyToId() != null && payload.getReplyToId() > 0) {
                        replyTo = messageRepository.findById(payload.getReplyToId()).orElse(null);
                }

                // Step 6: Save message
                Message message = Message.builder()
                                .sender(sender)
                                .content(payload.getContent())
                                .type(MessageType.TEXT)
                                .conversation(conversation)
                                .clientMessageId(payload.getClientMessageId())
                                .replyTo(replyTo)
                                .build();

                Message saved = messageRepository.save(message);
                log.info("Message saved: id={}, conversationId={}", saved.getId(), conversation.getId());

                // Step 7: Update conversation
                conversation.setLastMessage(saved);
                conversation.setLastMessagePreview(truncatePreview(payload.getContent()));
                conversationRepository.save(conversation);

                // Step 8: Update unread count for recipient
                Participant recipientParticipant = participantRepository
                                .findByConversationIdAndUserId(conversation.getId(), recipientId)
                                .orElseThrow(() -> new ResourceNotFoundException("Recipient participant not found"));

                recipientParticipant.setUnreadCount(recipientParticipant.getUnreadCount() + 1);
                participantRepository.save(recipientParticipant);

                // Step 9: Determine if this is a message request
                boolean isRequest = recipientParticipant.getStatus() == ParticipantStatus.REQUEST;

                // Step 10: Send ACK to sender
                sendAckToSender(senderId, AckEvent.builder()
                                .clientMessageId(payload.getClientMessageId())
                                .realMessageId(saved.getId())
                                .conversationId(conversation.getId())
                                .status(AckEvent.AckStatus.DELIVERED)
                                .build());

                // Step 11: Send message event to recipient
                ChatMessageEvent messageEvent = ChatMessageEvent.builder()
                                .id(saved.getId())
                                .clientMessageId(saved.getClientMessageId())
                                .conversationId(conversation.getId())
                                .senderId(senderId)
                                .senderName(getSenderName(sender))
                                .senderAvatarUrl(getSenderAvatarUrl(senderId))
                                .content(saved.getContent())
                                .messageType(saved.getType())
                                .replyToId(saved.getReplyTo() != null ? saved.getReplyTo().getId() : null)
                                .timestamp(saved.getCreatedAt())
                                .isRequest(isRequest)
                                .isNewConversation(isNewConversation)
                                .build();

                sendMessageToRecipient(recipientId, messageEvent);

                // Also broadcast to topic for existing subscribers (e.g., sender's other
                // devices)
                MessageResponse response = MessageResponse.builder()
                                .id(saved.getId())
                                .senderId(senderId)
                                .senderName(getSenderName(sender))
                                .content(saved.getContent())
                                .attachments(List.of())
                                .messageType(saved.getType())
                                .isActive(saved.getIsActive())
                                .conversationId(conversation.getId())
                                .replyToId(saved.getReplyTo() != null ? saved.getReplyTo().getId() : null)
                                .senderAvatarUrl(getSenderAvatarUrl(senderId))
                                .timestamp(saved.getCreatedAt())
                                .build();

                messagingTemplate.convertAndSend("/topic/message." + conversation.getId(),
                                new MessageEvent<>(MessageEventType.SEND, response));

                log.info("Message delivered: {} -> {}, isRequest={}", senderId, recipientId, isRequest);
        }

        /**
         * Send ACK event to sender via user queue.
         */
        private void sendAckToSender(Long userId, AckEvent ack) {
                messagingTemplate.convertAndSendToUser(
                                userId.toString(),
                                "/queue/ack",
                                ack);
        }

        /**
         * Send message event to recipient via user queue.
         */
        private void sendMessageToRecipient(Long userId, ChatMessageEvent event) {
                messagingTemplate.convertAndSendToUser(
                                userId.toString(),
                                "/queue/messages",
                                event);
        }

        /**
         * Truncate message content for preview (max 100 chars).
         */
        private String truncatePreview(String content) {
                if (content == null)
                        return null;
                if (content.length() <= 100)
                        return content;
                return content.substring(0, 97) + "...";
        }

        /**
         * Accept a message request - upgrades participant status from REQUEST to INBOX.
         */
        @Transactional
        public void acceptMessageRequest(User user, String conversationId) {
                Participant participant = participantRepository
                                .findByConversationIdAndUserId(conversationId, user.getId())
                                .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

                if (participant.getStatus() != ParticipantStatus.REQUEST) {
                        log.warn("Cannot accept: participant status is {}", participant.getStatus());
                        return;
                }

                participant.setStatus(ParticipantStatus.INBOX);
                participantRepository.save(participant);

                log.info("Message request accepted: user={}, conversation={}", user.getId(), conversationId);

                // Send upgrade event to user
                messagingTemplate.convertAndSendToUser(
                                user.getId().toString(),
                                "/queue/events",
                                com.example.vivuapp.dto.event.ChatAndActivity.ConversationUpgradedEvent.builder()
                                                .conversationId(conversationId)
                                                .newStatus(ParticipantStatus.INBOX)
                                                .reason(com.example.vivuapp.dto.event.ChatAndActivity.ConversationUpgradedEvent.UpgradeReason.MESSAGE_REQUEST_ACCEPTED)
                                                .build());
        }

        @Transactional
        public MessageResponse sendMessage(User user, MessageRequest request) {

                Conversation conversation = conversationRepository.findById(request.ConversationId())
                                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

                Message replyTo = null;
                if (request.replyToId() != null && request.replyToId() > 0) {
                        replyTo = messageRepository.findById(request.replyToId())
                                        .orElseThrow(() -> new ResourceNotFoundException("Replied message not found"));
                }

                Message message = Message.builder()
                                .sender(user)
                                .content(request.content())
                                .type(MessageType.TEXT)
                                .conversation(conversation)
                                .replyTo(replyTo)
                                .build();

                Message saved = messageRepository.save(message);

                conversation.setLastMessage(saved);
                conversationRepository.save(conversation);

                MessageResponse response = MessageResponse.builder()
                                .id(saved.getId())
                                .senderId(saved.getSender().getId())
                                .content(saved.getContent())
                                .attachments(List.of())
                                .messageType(saved.getType())
                                .isActive(saved.getIsActive())
                                .conversationId(message.getConversation().getId())
                                .replyToId(saved.getReplyTo() != null ? saved.getReplyTo().getId() : null)
                                .senderAvatarUrl(getSenderAvatarUrl(saved.getSender().getId()))
                                .timestamp(saved.getCreatedAt())
                                .build();

                // Gửi đến tất cả thành viên trong channel
                messagingTemplate.convertAndSend("/topic/message." + conversation.getId(),
                                new MessageEvent<>(MessageEventType.SEND, response));

                return response;
        }

        @Transactional
        public FileMessageResponse sendMessageWithFile(
                        User user,
                        List<MultipartFile> files,
                        String conversationId,
                        String content,
                        Long replyToId) {

                Conversation conversation = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

                // Upload files to Cloudinary (auto-detect FileType for each file)
                List<FileEntity> uploadedFiles = fileStorageService.uploadMultipleFiles(files, FileCategory.CHAT);

                // Get reply message if exists
                Message replyTo = null;
                if (replyToId != null && replyToId > 0) {
                        replyTo = messageRepository.findById(replyToId)
                                        .orElseThrow(() -> new ResourceNotFoundException("Replied message not found"));
                }

                // Determine MessageType from first file's FileType
                FileType firstFileType = uploadedFiles.isEmpty() ? FileType.DOCUMENT
                                : uploadedFiles.get(0).getFileType();
                MessageType messageType = switch (firstFileType) {
                        case IMAGE -> MessageType.IMAGE;
                        case VIDEO -> MessageType.VIDEO;
                        case AUDIO -> MessageType.AUDIO;
                        case DOCUMENT -> MessageType.DOCUMENT;
                };

                // Build message without attachments first
                Message message = Message.builder()
                                .sender(user)
                                .content(content)
                                .type(messageType)
                                .conversation(conversation)
                                .replyTo(replyTo)
                                .build();

                Message saved = messageRepository.save(message);

                // Create attachments linking message to file entities
                List<MessageAttachment> attachments = new ArrayList<>();
                for (FileEntity fileEntity : uploadedFiles) {
                        MessageAttachment attachment = MessageAttachment.builder()
                                        .message(saved)
                                        .file(fileEntity)
                                        .build();
                        attachments.add(attachment);
                }

                // Save attachments directly
                messageAttachmentRepository.saveAll(attachments);

                conversation.setLastMessage(saved);
                conversationRepository.save(conversation);

                // Extract URLs for response
                List<String> fileUrls = uploadedFiles.stream()
                                .map(FileEntity::getFileUrl)
                                .toList();

                FileMessageResponse response = FileMessageResponse.builder()
                                .id(saved.getId())
                                .senderId(saved.getSender().getId())
                                .senderName(user.getFirstName() + " " + user.getLastName())
                                .senderAvatarUrl(getSenderAvatarUrl(saved.getSender().getId()))
                                .content(content)
                                .fileUrls(fileUrls)
                                .messageType(saved.getType())
                                .isActive(saved.getIsActive())
                                .conversationId(conversation.getId())
                                .replyToId(saved.getReplyTo() != null ? saved.getReplyTo().getId() : null)
                                .timestamp(saved.getCreatedAt())
                                .build();

                // Broadcast to all participants
                messagingTemplate.convertAndSend("/topic/message." + conversation.getId(),
                                new MessageEvent<>(MessageEventType.SEND, response));

                return response;
        }

        @Transactional
        public Slice<MessageResponse> getMessagesByConversationId(User user, String conversationId, Pageable pageable) {

                Conversation conversation = conversationRepository
                                .findByIdAndParticipantUserId(conversationId, user.getId())
                                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

                List<Participant> participants = participantRepository.findByConversationId(conversationId);

                Participant currentParticipant = participants.stream()
                                .filter(p -> p.getUser().getId().equals(user.getId()))
                                .findFirst().orElseThrow(() -> new ResourceNotFoundException("Participant error"));

                Message lastMessage = conversation.getLastMessage();
                if (lastMessage != null && !Objects.equals(currentParticipant.getLastReadMessage(), lastMessage)) {
                        currentParticipant.setLastReadMessage(lastMessage);
                        participantRepository.save(currentParticipant);

                        MessageReadEvent readEventPayload = new MessageReadEvent(user.getId(), lastMessage.getId());
                        messagingTemplate.convertAndSend(
                                        "/topic/message." + conversation.getId(),
                                        new MessageEvent<>(MessageEventType.SEEN, readEventPayload));
                }

                Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                                Sort.by("createdAt").descending());
                Slice<Message> messages = messageRepository.findAllByConversationId(conversationId, sortedPageable);
                messages.stream();

                return messages.map(msg -> mapToMessageResponse(msg, participants));
        }

        private MessageResponse mapToMessageResponse(Message message, List<Participant> participants) {
                // Null-safe attachment mapping with orphaned reference protection
                List<MediaAttachmentResponse> attachmentResponses = message.getAttachments() != null
                                ? message.getAttachments().stream()
                                                .filter(att -> att.getFile() != null)
                                                .map(att -> MediaAttachmentResponse.builder()
                                                                .id(att.getId())
                                                                .messageId(message.getId())
                                                                .fileId(att.getFile().getId())
                                                                .fileUrl(att.getFile().getFileUrl())
                                                                .fileType(att.getFile().getFileType())
                                                                .fileSize(att.getFile().getFileSize())
                                                                .uploadedAt(att.getFile().getUploadedAt())
                                                                .build())
                                                .toList()
                                : List.of();

                return MessageResponse.builder()
                                .id(message.getId())
                                .senderId(message.getSender().getId())
                                .senderName(message.getSender().getFirstName() + " "
                                                + message.getSender().getLastName())
                                .content(message.getIsActive() ? message.getContent() : "This message is unsent")
                                .attachments(attachmentResponses)
                                .messageType(message.getType())
                                .conversationId(message.getConversation().getId())
                                .isActive(message.getIsActive())
                                .replyToId(message.getReplyTo() != null ? message.getReplyTo().getId() : null)
                                .timestamp(message.getCreatedAt())
                                .senderAvatarUrl(getSenderAvatarUrl(message.getSender().getId()))
                                .readBy(getUsersWhoReadMessage(message, participants))
                                .build();
        }

        private List<ReadReceiptResponse> getUsersWhoReadMessage(Message message, List<Participant> participants) {
                return participants.stream()
                                .filter(p -> !p.getUser().getId().equals(message.getSender().getId()))
                                .filter(p -> p.getLastReadMessage() != null
                                                && p.getLastReadMessage().getId() >= message.getId())
                                .map(p -> ReadReceiptResponse.builder()
                                                .userId(p.getUser().getId())
                                                .fullName(p.getUser().getFirstName() + " " + p.getUser().getLastName())
                                                .build())
                                .toList();
        }

        public String deleteMessage(User user, Long messageId) {

                var message = messageRepository.findByIdAndSenderId(messageId, user.getId());
                if (message.isPresent()) {
                        // Không cho xóa message đã bị thu hồi
                        if (!message.get().getIsActive()) {
                                throw new MessageAlreadyDeletedException();
                        }
                        message.get().setIsActive(false);
                        messageRepository.save(message.get());
                        messagingTemplate.convertAndSend(
                                        "/topic/message." + message.get().getConversation().getId(),
                                        new MessageEvent<>(MessageEventType.UNSEND, Map.of("messageId", messageId)));
                        return "Message deleted successfully";
                } else {
                        return "Message not found";
                }
        }

        public MessageResponse editMessage(User user, Long messageId, @NotBlank String newContent) {

                var message = messageRepository.findByIdAndSenderId(messageId, user.getId());
                if (message.isPresent()) {
                        Message msg = message.get();

                        // Không cho edit message đã bị thu hồi
                        if (!msg.getIsActive()) {
                                throw new MessageAlreadyDeletedException("Cannot edit deleted message");
                        }

                        msg.setContent(newContent);
                        Message updatedMessage = messageRepository.save(msg);
                        MessageResponse response = MessageResponse.builder()
                                        .id(updatedMessage.getId())
                                        .senderId(updatedMessage.getSender().getId())
                                        .senderName(updatedMessage.getSender().getFirstName() + " "
                                                        + updatedMessage.getSender().getLastName())
                                        .content(updatedMessage.getContent())
                                        .attachments(List.of())
                                        .messageType(updatedMessage.getType())
                                        .senderAvatarUrl(getSenderAvatarUrl(updatedMessage.getSender().getId()))
                                        .isActive(updatedMessage.getIsActive())
                                        .replyToId(updatedMessage.getReplyTo() != null
                                                        ? updatedMessage.getReplyTo().getId()
                                                        : null)
                                        .timestamp(updatedMessage.getCreatedAt())
                                        .build();
                        messagingTemplate.convertAndSend(
                                        "/topic/message." + updatedMessage.getConversation().getId(),
                                        new MessageEvent<>(MessageEventType.EDIT, response));
                        return response;
                } else {
                        throw new ResourceNotFoundException("Message not found");
                }

        }

        @Transactional
        public void markAsRead(User user, String conversationId, Long messageId) {

                Participant participant = participantRepository
                                .findByConversationIdAndUserId(conversationId, user.getId())
                                .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

                Message currentLastRead = participant.getLastReadMessage();

                if (currentLastRead == null || messageId > currentLastRead.getId()) {

                        Message messageToMark = messageRepository.findById(messageId)
                                        .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

                        participant.setLastReadMessage(messageToMark);
                        participantRepository.save(participant);

                        MessageReadEvent readEventPayload = new MessageReadEvent(user.getId(), messageId);
                        messagingTemplate.convertAndSend(
                                        "/topic/message." + conversationId,
                                        new MessageEvent<>(MessageEventType.SEEN, readEventPayload));
                }
        }

        public void handleTypingEvent(User user, String conversationId, TypingEvent typingEvent) {
                boolean isParticipant = participantRepository
                                .existsByConversationIdAndUserId(conversationId, user.getId());

                if (!isParticipant) {
                        log.warn("User {} tried to send typing event to conversation {} but is not a participant",
                                        user.getId(), conversationId);
                        return;
                }

                TypingEvent event = TypingEvent.builder()
                                .userId(user.getId())
                                .userName(user.getFirstName() + " " + user.getLastName())
                                .conversationId(conversationId)
                                .isTyping(typingEvent.getIsTyping())
                                .build();

                messagingTemplate.convertAndSend(
                                "/topic/message." + conversationId,
                                new MessageEvent<>(MessageEventType.TYPING, event));

                log.debug("Typing event: User {} {} typing in conversation {}",
                                user.getId(),
                                event.getIsTyping() ? "started" : "stopped",
                                conversationId);
        }

        /**
         * Search messages in a specific conversation
         */
        public Slice<MessageSearchResponse> searchInConversation(
                        User user,
                        String conversationId,
                        String keyword,
                        Pageable pageable) {

                // Verify user is participant
                boolean isParticipant = participantRepository.existsByConversationIdAndUserId(conversationId,
                                user.getId());
                if (!isParticipant) {
                        throw new ResourceNotFoundException("Conversation not found or you are not a participant");
                }

                Slice<Message> messages = messageRepository.searchMessagesInConversation(conversationId, keyword,
                                pageable);

                return messages.map(m -> MessageSearchResponse.builder()
                                .id(m.getId())
                                .conversationId(conversationId)
                                .conversationName(null) // Same conversation
                                .senderId(m.getSender().getId())
                                .senderName(m.getSender().getFirstName() + " " + m.getSender().getLastName())
                                .senderAvatar(getSenderAvatarUrl(m.getSender().getId()))
                                .content(m.getContent())
                                .messageType(m.getType())
                                .fileUrls(m.getFileUrls())
                                .timestamp(m.getCreatedAt())
                                .build());
        }
}
