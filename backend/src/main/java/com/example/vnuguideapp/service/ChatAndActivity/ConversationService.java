package com.example.vnuguideapp.service.ChatAndActivity;

import com.example.vnuguideapp.dto.reponse.ChatAndActivity.ConversationResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.MediaAttachmentResponse;
import com.example.vnuguideapp.dto.request.ChatAndActivity.ConversationPrivateRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.ChatAndActivity.Conversation;
import com.example.vnuguideapp.entity.ChatAndActivity.MessageAttachment;
import com.example.vnuguideapp.entity.ChatAndActivity.Participant;
import com.example.vnuguideapp.enums.ConversationType;
import com.example.vnuguideapp.enums.FileType;
import com.example.vnuguideapp.enums.MessageType;
import com.example.vnuguideapp.enums.ParticipantRole;
import com.example.vnuguideapp.enums.ParticipantStatus;
import com.example.vnuguideapp.enums.RelationshipStatus;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.service.AccountAndAuthorization.RelationshipService;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ConversationRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.MessageAttachmentRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ParticipantRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ChannelRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.example.vnuguideapp.dto.event.MessageEvent;
import com.example.vnuguideapp.enums.MessageEventType;
import com.example.vnuguideapp.entity.ChatAndActivity.Channel;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.ChannelResponse;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConversationService {

    ConversationRepository conversationRepository;
    UserRepository userRepository;
    ParticipantRepository participantRepository;
    MessageAttachmentRepository messageAttachmentRepository;
    RelationshipService relationshipService;
    ChannelRepository channelRepository;
    SimpMessagingTemplate messagingTemplate;

    private String getConversationName(Long userId, Conversation conversation) {
        if (conversation.getType() == ConversationType.CHANNEL) {
            return conversation.getTitle();
        } else if (conversation.getType() == ConversationType.DIRECT) {
            return participantRepository.findOtherParticipantFullName(conversation.getId(), userId);
        } else {
            User user = userRepository.findById(userId).orElseThrow(
                    () -> new ResourceNotFoundException("User not found with id: " + userId));
            return user.getFirstName() + " " + user.getLastName();
        }
    }

    private Long getUnreadMessageCount(Long userId, Conversation conversation) {
        for (Participant p : conversation.getParticipants()) {
            if (p.getUser().getId().equals(userId)) {
                var lastReadMessageId = p.getLastReadMessage() != null ? p.getLastReadMessage().getId() : 0L;
                return conversation.getMessages().stream()
                        .filter(m -> m.getId() > lastReadMessageId)
                        .filter(m -> !m.getSender().getId().equals(userId))
                        .count();
            }
        }
        return 0L;
    }

    private String getLastMessageContent(Conversation conversation) {
        if (conversation.getLastMessage() == null) {
            return null;
        }
        if (conversation.getLastMessage().getType() == MessageType.VIDEO) {
            return "Sent a video";
        } else if (conversation.getLastMessage().getType() == MessageType.IMAGE) {
            return "Sent an image ";
        } else if (conversation.getLastMessage().getType() == MessageType.AUDIO) {
            return "Sent an voice ";
        } else {
            return conversation.getLastMessage().getIsActive() ? conversation.getLastMessage().getContent()
                    : "This message is unsent";
        }
    }

    @Transactional
    public String createPrivateConversation(User user, ConversationPrivateRequest request) {

        ConversationType conversationType = request.receiverId().equals(user.getId())
                ? ConversationType.YOURSELF
                : ConversationType.DIRECT;

        Conversation conversation = Conversation.builder()
                .type(conversationType)
                .build();

        Conversation savedConversation = conversationRepository.save(conversation);

        List<Participant> participants = new ArrayList<>();

        boolean isSelf = request.receiverId().equals(user.getId());

        participants.add(
                Participant.builder()
                        .conversation(savedConversation)
                        .user(user)
                        .role(ParticipantRole.ADMIN)
                        .build());

        if (!isSelf) {
            User receiver = userRepository.findById(request.receiverId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            participants.add(
                    Participant.builder()
                            .conversation(savedConversation)
                            .user(receiver)
                            .role(ParticipantRole.ADMIN)
                            .build());
        }

        participantRepository.saveAll(participants);

        return savedConversation.getId();
    }

    public Slice<ConversationResponse> getConversationsByType(User user, ConversationType type, Pageable pageable) {
        Slice<Conversation> conversations = conversationRepository.findByParticipantUserIdAndType(user.getId(), type,
                pageable);
        return mapConversationsToResponse(conversations, user.getId());
    }

    /**
     * Get conversations filtered by participant status (INBOX, REQUEST, ARCHIVED,
     * DELETED).
     */
    public Slice<ConversationResponse> getConversationsByStatus(User user, ParticipantStatus status,
            Pageable pageable) {
        Slice<Conversation> conversations = conversationRepository.findByParticipantUserIdAndStatus(
                user.getId(), status, pageable);
        return mapConversationsToResponse(conversations, user.getId());
    }

    private Slice<ConversationResponse> mapConversationsToResponse(Slice<Conversation> conversations, Long userId) {
        return conversations.map(conversation -> {
            Participant currentUserParticipant = conversation.getParticipants().stream()
                    .filter(p -> p.getUser().getId().equals(userId))
                    .findFirst()
                    .orElse(null);

            ParticipantStatus participantStatus = currentUserParticipant != null
                    ? currentUserParticipant.getStatus()
                    : ParticipantStatus.INBOX;

            Long otherUserId = null;
            RelationshipStatus relationshipStatus = null;

            if (conversation.getType() == ConversationType.DIRECT) {
                Participant otherParticipant = conversation.getParticipants().stream()
                        .filter(p -> !p.getUser().getId().equals(userId))
                        .findFirst()
                        .orElse(null);

                if (otherParticipant != null) {
                    otherUserId = otherParticipant.getUser().getId();

                    relationshipStatus = relationshipService.getRelationshipStatus(userId, otherUserId);
                    if (relationshipStatus == null) {
                        relationshipStatus = RelationshipStatus.NONE;
                    }
                }
            }

            ConversationResponse.ConversationResponseBuilder builder = ConversationResponse.builder()
                    .id(conversation.getId())
                    .name(getConversationName(userId, conversation))
                    .avatarUrl(conversation.getAvatar() != null ? conversation.getAvatar().getFileUrl() : null)
                    .unreadCount(getUnreadMessageCount(userId, conversation))
                    .lastMessage(getLastMessageContent(conversation))
                    .participantStatus(participantStatus)
                    .otherUserId(otherUserId)
                    .relationshipStatus(relationshipStatus);

            if (conversation.getLastMessage() != null) {
                builder.lastMessageTime(conversation.getLastMessage().getCreatedAt());
            }

            return builder.build();
        });
    }

    /**
     * Delete a conversation for the current user.
     * For DIRECT conversations: Uses soft-delete (DELETED status) with pessimistic
     * locking.
     * For GROUP/CHANNEL conversations: Hard deletes the participant record.
     *
     * @param user           The user deleting the conversation
     * @param conversationId The conversation to delete
     * @return Success message
     */
    @Transactional
    public String leaveConversation(User user, String conversationId) {
        // Use pessimistic lock to prevent race condition on concurrent deletes
        Conversation conversation = conversationRepository.findByIdWithLock(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        Participant participant = participantRepository.findByConversationIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User is not a participant in this conversation"));

        if (conversation.getType() == com.example.vnuguideapp.enums.ConversationType.DIRECT) {
            // DIRECT conversation: Soft delete - mark as DELETED
            participant.setStatus(com.example.vnuguideapp.enums.ParticipantStatus.DELETED);
            participant.setDeletedAt(java.time.LocalDateTime.now());
            participant.setUnreadCount(0); // Reset unread count
            participantRepository.save(participant);

            // Check if all participants have deleted (with lock still held)
            long activeCount = conversationRepository.countActiveParticipants(conversationId);

            if (activeCount == 0) {
                // Full cleanup - both users have deleted the conversation
                conversationRepository.delete(conversation);
                return "Conversation permanently deleted (both users deleted)";
            }

            return "Conversation deleted from your inbox";
        } else {
            // GROUP/CHANNEL: Hard delete the participant record
            participantRepository.delete(participant);

            // Update channel member count if it's a channel
            if (conversation.getType() == com.example.vnuguideapp.enums.ConversationType.CHANNEL) {
                 channelRepository.findByConversationId(conversationId).ifPresent(channel -> {
                    Long memberCount = participantRepository.countByConversationId(conversationId);
                    channel.setMemberCount(memberCount);
                    channelRepository.save(channel);

                    // Broadcast update
                    ChannelResponse response = ChannelResponse.builder()
                        .id(channel.getId())
                        .name(channel.getName())
                        .description(channel.getDescription())
                        .privacy(channel.getPrivacy())
                        .channelType(channel.getChannelType())
                        .category(channel.getCategory())
                        .allowSharing(channel.getAllowSharing())
                        .avatarUrl(channel.getAvatar() != null ? channel.getAvatar().getFileUrl() : null)
                        .conversationId(channel.getConversation().getId())
                        .memberCount(memberCount.intValue())
                        .inviteCode(channel.getInviteCode())
                        .createdAt(channel.getCreatedAt())
                        .build();

                    messagingTemplate.convertAndSend("/topic/channel." + conversationId,
                        new MessageEvent<>(MessageEventType.CHANNEL_CHANGED, response));
                });
            }

            return "Successfully left conversation with id: " + conversationId;
        }
    }

    public List<MediaAttachmentResponse> getConversationMedia(User user, String conversationId, FileType fileType) {
        // Verify user is participant
        boolean isParticipant = participantRepository.existsByConversationIdAndUserId(conversationId, user.getId());
        if (!isParticipant) {
            throw new ResourceNotFoundException("Conversation not found or you are not a participant");
        }

        List<MessageAttachment> attachments;
        if (fileType != null) {
            attachments = messageAttachmentRepository.findAllByConversationIdAndFileType(conversationId, fileType);
        } else {
            attachments = messageAttachmentRepository.findAllByConversationId(conversationId);
        }

        return attachments.stream()
                .map(a -> MediaAttachmentResponse.builder()
                        .id(a.getId())
                        .messageId(a.getMessage().getId())
                        .fileId(a.getFile().getId())
                        .fileUrl(a.getFile().getFileUrl())
                        .fileType(a.getFile().getFileType())
                        .fileSize(a.getFile().getFileSize())
                        .uploadedAt(a.getFile().getUploadedAt())
                        .build())
                .toList();
    }

}
