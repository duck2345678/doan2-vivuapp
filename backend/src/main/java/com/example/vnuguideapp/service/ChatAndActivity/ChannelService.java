package com.example.vnuguideapp.service.ChatAndActivity;

import com.example.vnuguideapp.dto.event.MessageEvent;
import com.example.vnuguideapp.dto.event.ChatAndActivity.ChannelEventPayload;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.ChannelMemberResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.ChannelResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.JoinConversationResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.MessageResponse;
import com.example.vnuguideapp.dto.request.ChatAndActivity.AddChannelMemberRequest;
import com.example.vnuguideapp.dto.request.ChatAndActivity.CreateChannelRequest;
import com.example.vnuguideapp.dto.request.ChatAndActivity.UpdateChannelRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.ChatAndActivity.Channel;
import com.example.vnuguideapp.entity.ChatAndActivity.Conversation;
import com.example.vnuguideapp.entity.ChatAndActivity.JoinConversation;
import com.example.vnuguideapp.entity.ChatAndActivity.Message;
import com.example.vnuguideapp.entity.ChatAndActivity.Participant;
import com.example.vnuguideapp.entity.Storage.FileEntity;
import com.example.vnuguideapp.enums.ChannelCategory;
import com.example.vnuguideapp.enums.ChannelPrivacy;
import com.example.vnuguideapp.enums.ChannelType;
import com.example.vnuguideapp.enums.ConversationType;
import com.example.vnuguideapp.enums.FileCategory;
import com.example.vnuguideapp.enums.MessageEventType;
import com.example.vnuguideapp.enums.MessageType;
import com.example.vnuguideapp.enums.ParticipantRole;
import com.example.vnuguideapp.exception.exceptionImpl.ForbiddenException;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ChannelRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ConversationRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.JoinConversationRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.MessageRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ParticipantRepository;
import com.example.vnuguideapp.service.File.FileStorageService;
import com.example.vnuguideapp.service.Notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class ChannelService {

        ChannelRepository channelRepository;
        ConversationRepository conversationRepository;
        ParticipantRepository participantRepository;
        MessageRepository messageRepository;
        UserRepository userRepository;
        FileStorageService fileStorageService;
        SimpMessagingTemplate messagingTemplate;
        UserProfileRepository userProfileRepository;
        JoinConversationRepository joinConversationRepository;
        @Lazy
        NotificationService notificationService;

        private static final String INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        private static final int INVITE_CODE_LENGTH = 10;
        private static final SecureRandom secureRandom = new SecureRandom();

        private String generateInviteCode() {
                StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
                for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
                        sb.append(INVITE_CODE_CHARS.charAt(secureRandom.nextInt(INVITE_CODE_CHARS.length())));
                }
                return sb.toString();
        }

        private String generateUniqueInviteCode() {
                String code;
                int attempts = 0;
                do {
                        code = generateInviteCode();
                        attempts++;
                        if (attempts > 10) {
                                throw new RuntimeException("Unable to generate unique invite code");
                        }
                } while (channelRepository.existsByInviteCode(code));
                return code;
        }

        @Transactional
        public ChannelResponse createChannel(User user, CreateChannelRequest request, MultipartFile avatar) {
                // 1. Upload avatar if provided
                FileEntity avatarFile = null;
                if (avatar != null && !avatar.isEmpty()) {
                        avatarFile = fileStorageService.uploadFile(avatar, FileCategory.CHANNEL_AVATAR);
                }

                // 2. Create conversation with type CHANNEL
                Conversation conversation = Conversation.builder()
                                .title(request.name())
                                .type(ConversationType.CHANNEL)
                                .avatar(avatarFile) // Set avatar on conversation
                                .build();

                Conversation savedConversation = conversationRepository.save(conversation);

                // 3. Create channel linked to conversation
                Channel channel = Channel.builder()
                                .name(request.name())
                                .description(request.description())
                                .privacy(request.privacy() != null ? request.privacy() : ChannelPrivacy.PUBLIC)
                                .channelType(request.channelType() != null ? request.channelType() : ChannelType.TEXT)
                                .category(request.category() != null ? request.category() : ChannelCategory.OTHER)
                                .allowSharing(request.allowSharing() != null ? request.allowSharing() : true)
                                .inviteCode(generateUniqueInviteCode())
                                .avatar(avatarFile) // Set avatar on channel
                                .conversation(savedConversation)
                                .build();

                Channel savedChannel = channelRepository.save(channel);

                // 3. Create participants (creator as ADMIN)
                List<Participant> participants = new ArrayList<>();

                // Add creator as ADMIN
                participants.add(
                                Participant.builder()
                                                .conversation(savedConversation)
                                                .user(user)
                                                .role(ParticipantRole.ADMIN)
                                                .build());

                // Add other participants as MEMBER
                if (request.participantIds() != null && !request.participantIds().isEmpty()) {
                        request.participantIds().stream()
                                        .filter(id -> !id.equals(user.getId())) // Exclude creator
                                        .forEach(participantId -> {
                                                User member = userRepository.findById(participantId)
                                                                .orElseThrow(() -> new ResourceNotFoundException(
                                                                                "User not found with id: "
                                                                                                + participantId));
                                                participants.add(
                                                                Participant.builder()
                                                                                .conversation(savedConversation)
                                                                                .user(member)
                                                                                .role(ParticipantRole.MEMBER)
                                                                                .build());
                                        });
                }

                participantRepository.saveAll(participants);

                // 4. Update memberCount on channel
                savedChannel.setMemberCount((long) participants.size());
                channelRepository.save(savedChannel);

                // 5. Send WebSocket notification to all new members (excluding creator)
                ChannelEventPayload eventPayload = ChannelEventPayload.builder()
                                .channelId(savedChannel.getId())
                                .conversationId(savedConversation.getId())
                                .channelName(savedChannel.getName())
                                .build();

                participants.stream()
                                .filter(p -> !p.getUser().getId().equals(user.getId())) // Exclude creator
                                .forEach(p -> {
                                        messagingTemplate.convertAndSendToUser(
                                                        p.getUser().getId().toString(),
                                                        "/queue/events",
                                                        new MessageEvent<>(MessageEventType.CHANNEL_CREATED, eventPayload));
                                });

                // 6. Build response
                return ChannelResponse.builder()
                                .id(savedChannel.getId())
                                .name(savedChannel.getName())
                                .description(savedChannel.getDescription())
                                .privacy(savedChannel.getPrivacy())
                                .channelType(savedChannel.getChannelType())
                                .category(savedChannel.getCategory())
                                .allowSharing(savedChannel.getAllowSharing())
                                .avatarUrl(savedChannel.getAvatar() != null
                                                ? savedChannel.getAvatar().getFileUrl()
                                                : null)
                                .conversationId(savedConversation.getId())
                                .creatorId(user.getId())
                                .memberCount(savedChannel.getMemberCount().intValue())
                                .inviteCode(savedChannel.getInviteCode())
                                .createdAt(savedChannel.getCreatedAt())
                                .build();
        }

        public ChannelResponse getChannelById(Long channelId) {
                Channel channel = channelRepository.findById(channelId)
                                .orElseThrow(() -> new ResourceNotFoundException("Channel not found"));

                Long memberCount = participantRepository.countByConversationId(channel.getConversation().getId());

                return buildChannelResponse(channel, memberCount, null);
        }

        public ChannelResponse getChannelByConversationId(String conversationId) {
                Channel channel = channelRepository.findByConversationId(conversationId)
                                .orElseThrow(() -> new ResourceNotFoundException("Channel not found for conversation"));

                Long memberCount = participantRepository.countByConversationId(conversationId);

                return buildChannelResponse(channel, memberCount, null);
        }

        // Helper method to build ChannelResponse consistently
        private ChannelResponse buildChannelResponse(Channel channel, Long memberCount, User user) {
                Boolean isJoined = null;
                if (user != null) {
                        isJoined = participantRepository
                                        .findByConversationIdAndUserId(channel.getConversation().getId(), user.getId())
                                        .isPresent();
                }
                return ChannelResponse.builder()
                                .id(channel.getId())
                                .name(channel.getName())
                                .description(channel.getDescription())
                                .privacy(channel.getPrivacy())
                                .channelType(channel.getChannelType())
                                .category(channel.getCategory())
                                .allowSharing(channel.getAllowSharing())
                                .avatarUrl(channel.getAvatar() != null ? channel.getAvatar().getFileUrl() : null)
                                .conversationId(channel.getConversation().getId())
                                .memberCount(memberCount != null ? memberCount.intValue()
                                                : channel.getMemberCount().intValue())
                                .inviteCode(channel.getInviteCode())
                                .isJoined(isJoined)
                                .createdAt(channel.getCreatedAt())
                                .build();
        }

        @Transactional
        public ChannelResponse updateChannel(User user, Long channelId, UpdateChannelRequest request,
                        MultipartFile avatar) {
                // 1. Find channel
                Channel channel = channelRepository.findById(channelId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Channel not found with id: " + channelId));

                Conversation conversation = channel.getConversation();

                // 2. Permission check - verify user is ADMIN
                Participant participant = participantRepository
                                .findByConversationIdAndUserId(conversation.getId(), user.getId())
                                .orElseThrow(() -> new ForbiddenException("You are not a member of this channel"));

                if (participant.getRole() != ParticipantRole.ADMIN) {
                        throw new ForbiddenException("Only admins can update channel information");
                }

                // 3. Upload new avatar if provided
                if (avatar != null && !avatar.isEmpty()) {
                        FileEntity newAvatar = fileStorageService.uploadFile(avatar, FileCategory.CHANNEL_AVATAR);
                        channel.setAvatar(newAvatar);
                        conversation.setAvatar(newAvatar);
                }

                // 4. Update fields (only non-null)
                if (request.name() != null && !request.name().isBlank()) {
                        channel.setName(request.name());
                        conversation.setTitle(request.name());
                }
                if (request.description() != null) {
                        channel.setDescription(request.description());
                }
                if (request.privacy() != null) {
                        channel.setPrivacy(request.privacy());
                }
                if (request.category() != null) {
                        channel.setCategory(request.category());
                }
                if (request.allowSharing() != null) {
                        channel.setAllowSharing(request.allowSharing());
                }

                // 5. Save changes
                Channel updatedChannel = channelRepository.save(channel);
                conversationRepository.save(conversation);

                // 6. Build response
                Long memberCount = participantRepository.countByConversationId(conversation.getId());
                ChannelResponse response = buildChannelResponse(updatedChannel, memberCount, null);

                // 7. Broadcast to all channel members
                messagingTemplate.convertAndSend("/topic/channel." + conversation.getId(),
                                new MessageEvent<>(MessageEventType.CHANNEL_CHANGED, response));

                return response;
        }

        public List<ChannelMemberResponse> getChannelMembers(Long channelId) {
                // 1. Find channel
                Channel channel = channelRepository.findById(channelId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Channel not found with id: " + channelId));

                // 2. Get all participants from conversation
                List<Participant> participants = participantRepository
                                .findByConversationId(channel.getConversation().getId());

                // 3. Map to response
                return participants.stream()
                                .map(p -> ChannelMemberResponse.builder()
                                                .userId(p.getUser().getId())
                                                .userName(p.getUser().getFirstName() + " " + p.getUser().getLastName())
                                                .avatarUrl(userProfileRepository.findByUserId(p.getUser().getId())
                                                                .map(profile -> profile.getAvatarUrl())
                                                                .orElse(null))
                                                .role(p.getRole())
                                                .joinedAt(p.getJoinedAt())
                                                .build())
                                .toList();
        }

        @Transactional
        public ChannelResponse addChannelMembers(User user, Long channelId, AddChannelMemberRequest request) {
                // 1. Find channel
                Channel channel = channelRepository.findById(channelId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Channel not found with id: " + channelId));

                Conversation conversation = channel.getConversation();

                // 2. Permission check - verify user is ADMIN
                Participant requester = participantRepository
                                .findByConversationIdAndUserId(conversation.getId(), user.getId())
                                .orElseThrow(() -> new ForbiddenException("You are not a member of this channel"));

                if (requester.getRole() != ParticipantRole.ADMIN) {
                        throw new ForbiddenException("Only admins can add members to the channel");
                }

                // 3. Add new participants
                List<Participant> newParticipants = new ArrayList<>();
                for (Long userId : request.userIds()) {
                        // Check if already a member
                        if (participantRepository.findByConversationIdAndUserId(conversation.getId(), userId)
                                        .isPresent()) {
                                continue; // Skip if already member
                        }

                        User newMember = userRepository.findById(userId)
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "User not found with id: " + userId));

                        Participant newParticipant = Participant.builder()
                                        .conversation(conversation)
                                        .user(newMember)
                                        .role(ParticipantRole.MEMBER)
                                        .build();
                        newParticipants.add(newParticipant);
                }

                participantRepository.saveAll(newParticipants);

                // 4. Create system message for each new member added
                for (Participant newParticipant : newParticipants) {
                        String adderName = user.getFirstName() + " " + user.getLastName();
                        User addedUser = newParticipant.getUser();
                        String addedName = addedUser.getFirstName() + " " + addedUser.getLastName();
                        String systemMessageContent = adderName + " đã thêm " + addedName + " vào nhóm";

                        Message systemMessage = Message.builder()
                                        .sender(user)
                                        .content(systemMessageContent)
                                        .type(MessageType.SYSTEM)
                                        .conversation(conversation)
                                        .build();

                        Message savedSystemMessage = messageRepository.save(systemMessage);

                        // Update conversation's last message
                        conversation.setLastMessage(savedSystemMessage);
                        conversation.setLastMessagePreview(systemMessageContent);
                        conversationRepository.save(conversation);

                        // Broadcast system message to all subscribers
                        MessageResponse systemMsgResponse = MessageResponse.builder()
                                        .id(savedSystemMessage.getId())
                                        .senderId(user.getId())
                                        .senderName(adderName)
                                        .content(systemMessageContent)
                                        .attachments(List.of())
                                        .messageType(MessageType.SYSTEM)
                                        .isActive(true)
                                        .conversationId(conversation.getId())
                                        .timestamp(savedSystemMessage.getCreatedAt())
                                        .build();

                        messagingTemplate.convertAndSend("/topic/message." + conversation.getId(),
                                        new MessageEvent<>(MessageEventType.SEND, systemMsgResponse));
                }

                // 5. Send notifications to new members
                for (Participant newParticipant : newParticipants) {
                        notificationService.notifyChannelInvite(
                                        newParticipant.getUser(), user,
                                        conversation.getId(), channel.getName());
                }

                // 6. Send WebSocket event to new members to trigger conversation list refresh
                ChannelEventPayload eventPayload = ChannelEventPayload.builder()
                                .channelId(channel.getId())
                                .conversationId(conversation.getId())
                                .channelName(channel.getName())
                                .build();

                for (Participant newParticipant : newParticipants) {
                        messagingTemplate.convertAndSendToUser(
                                        newParticipant.getUser().getId().toString(),
                                        "/queue/events",
                                        new MessageEvent<>(MessageEventType.MEMBER_ADDED, eventPayload));
                }

                // 7. Update member count
                Long totalMembers = participantRepository.countByConversationId(conversation.getId());
                channel.setMemberCount(totalMembers);
                channelRepository.save(channel);

                // 8. Build response
                ChannelResponse response = buildChannelResponse(channel, totalMembers, null);

                // 9. Broadcast update to all members
                messagingTemplate.convertAndSend("/topic/channel." + conversation.getId(),
                                new MessageEvent<>(MessageEventType.CHANNEL_CHANGED, response));

                return response;
        }

        @Transactional
        public ChannelResponse removeChannelMember(User user, Long channelId, Long memberId) {
                // 1. Find channel
                Channel channel = channelRepository.findById(channelId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Channel not found with id: " + channelId));

                Conversation conversation = channel.getConversation();

                // 2. Permission check - verify user is ADMIN
                Participant requester = participantRepository
                                .findByConversationIdAndUserId(conversation.getId(), user.getId())
                                .orElseThrow(() -> new ForbiddenException("You are not a member of this channel"));

                if (requester.getRole() != ParticipantRole.ADMIN) {
                        throw new ForbiddenException("Only admins can remove members from the channel");
                }

                // 3. Find and remove participant
                Participant memberToRemove = participantRepository
                                .findByConversationIdAndUserId(conversation.getId(), memberId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "User is not a member of this channel"));

                // Prevent removing yourself (use leave endpoint instead)
                if (memberId.equals(user.getId())) {
                        throw new ForbiddenException("Use the leave endpoint to remove yourself from the channel");
                }

                participantRepository.delete(memberToRemove);

                // 4. Update member count
                Long totalMembers = participantRepository.countByConversationId(conversation.getId());
                channel.setMemberCount(totalMembers);
                channelRepository.save(channel);

                // 5. Build response
                ChannelResponse response = buildChannelResponse(channel, totalMembers, null);

                // 6. Broadcast update to all remaining members
                messagingTemplate.convertAndSend("/topic/channel." + conversation.getId(),
                                new MessageEvent<>(MessageEventType.CHANNEL_CHANGED, response));

                return response;
        }

        public List<JoinConversationResponse> getChannelJoinRequests(User user, Long channelId) {
                // 1. Find channel
                Channel channel = channelRepository.findById(channelId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Channel not found with id: " + channelId));

                Conversation conversation = channel.getConversation();

                // 2. Permission check - verify user is ADMIN
                Participant requester = participantRepository
                                .findByConversationIdAndUserId(conversation.getId(), user.getId())
                                .orElseThrow(() -> new ForbiddenException("You are not a member of this channel"));

                if (requester.getRole() != ParticipantRole.ADMIN) {
                        throw new ForbiddenException("Only admins can view join requests");
                }

                // 3. Get all join requests for this conversation
                List<JoinConversation> joinRequests = joinConversationRepository
                                .findByConversationId(conversation.getId());

                // 4. Map to response
                return joinRequests.stream()
                                .map(jr -> JoinConversationResponse.builder()
                                                .id(jr.getId())
                                                .conversationId(jr.getConversation().getId())
                                                .userId(jr.getUser().getId())
                                                .status(jr.getStatus())
                                                .createdAt(jr.getCreatedAt())
                                                .build())
                                .toList();
        }

        // ==================== PUBLIC CHANNEL DISCOVERY METHODS ====================

        /**
         * Get all public channels with optional search and category filter
         */
        public List<ChannelResponse> discoverPublicChannels(User user, String search, ChannelCategory category,
                        int page,
                        int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<Channel> channels;

                if (search != null && !search.isBlank()) {
                        channels = channelRepository.searchPublicChannels(ChannelPrivacy.PUBLIC, search.trim(),
                                        pageable);
                } else if (category != null) {
                        channels = channelRepository.findByPrivacyAndCategoryOrderByMemberCountDesc(
                                        ChannelPrivacy.PUBLIC, category, pageable);
                } else {
                        channels = channelRepository.findByPrivacyOrderByCreatedAtDesc(ChannelPrivacy.PUBLIC, pageable);
                }

                return channels.getContent().stream()
                                .map(channel -> buildChannelResponse(channel, channel.getMemberCount(), user))
                                .toList();
        }

        /**
         * Get channel by invite code (for joining via invite link)
         */
        public ChannelResponse getChannelByInviteCode(String inviteCode) {
                Channel channel = channelRepository.findByInviteCode(inviteCode)
                                .orElseThrow(() -> new ResourceNotFoundException("Invalid invite code"));

                Long memberCount = participantRepository.countByConversationId(channel.getConversation().getId());
                return buildChannelResponse(channel, memberCount, null);
        }

        /**
         * Join channel via invite code
         */
        @Transactional
        public ChannelResponse joinChannelByInviteCode(User user, String inviteCode) {
                Channel channel = channelRepository.findByInviteCode(inviteCode)
                                .orElseThrow(() -> new ResourceNotFoundException("Invalid invite code"));

                Conversation conversation = channel.getConversation();

                // Check if already a member
                if (participantRepository.findByConversationIdAndUserId(conversation.getId(), user.getId())
                                .isPresent()) {
                        throw new ForbiddenException("You are already a member of this channel");
                }

                // Add user as member
                Participant participant = Participant.builder()
                                .conversation(conversation)
                                .user(user)
                                .role(ParticipantRole.MEMBER)
                                .build();
                participantRepository.save(participant);

                // Update member count
                Long totalMembers = participantRepository.countByConversationId(conversation.getId());
                channel.setMemberCount(totalMembers);
                channelRepository.save(channel);

                // Build and broadcast response
                ChannelResponse response = buildChannelResponse(channel, totalMembers, user);
                messagingTemplate.convertAndSend("/topic/channel." + conversation.getId(),
                                new MessageEvent<>(MessageEventType.CHANNEL_CHANGED, response));

                return response;
        }

        /**
         * Regenerate invite code (ADMIN only)
         */
        @Transactional
        public ChannelResponse regenerateInviteCode(User user, Long channelId) {
                Channel channel = channelRepository.findById(channelId)
                                .orElseThrow(() -> new ResourceNotFoundException("Channel not found"));

                Conversation conversation = channel.getConversation();

                // Permission check - verify user is ADMIN
                Participant participant = participantRepository
                                .findByConversationIdAndUserId(conversation.getId(), user.getId())
                                .orElseThrow(() -> new ForbiddenException("You are not a member of this channel"));

                if (participant.getRole() != ParticipantRole.ADMIN) {
                        throw new ForbiddenException("Only admins can regenerate invite code");
                }

                // Generate new invite code
                channel.setInviteCode(generateUniqueInviteCode());
                channelRepository.save(channel);

                Long memberCount = participantRepository.countByConversationId(conversation.getId());
                return buildChannelResponse(channel, memberCount, null);
        }

        /**
         * Update member role (promote/demote) - ADMIN only
         */
        @Transactional
        public ChannelMemberResponse updateMemberRole(User user, Long channelId, Long memberId,
                        ParticipantRole newRole) {
                Channel channel = channelRepository.findById(channelId)
                                .orElseThrow(() -> new ResourceNotFoundException("Channel not found"));

                Conversation conversation = channel.getConversation();

                // Permission check - verify user is ADMIN
                Participant requester = participantRepository
                                .findByConversationIdAndUserId(conversation.getId(), user.getId())
                                .orElseThrow(() -> new ForbiddenException("You are not a member of this channel"));

                if (requester.getRole() != ParticipantRole.ADMIN) {
                        throw new ForbiddenException("Only admins can update member roles");
                }

                // Cannot change own role
                if (memberId.equals(user.getId())) {
                        throw new ForbiddenException("You cannot change your own role");
                }

                // Find and update member
                Participant memberToUpdate = participantRepository
                                .findByConversationIdAndUserId(conversation.getId(), memberId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "User is not a member of this channel"));

                memberToUpdate.setRole(newRole);
                participantRepository.save(memberToUpdate);

                return ChannelMemberResponse.builder()
                                .userId(memberToUpdate.getUser().getId())
                                .userName(memberToUpdate.getUser().getFirstName() + " "
                                                + memberToUpdate.getUser().getLastName())
                                .avatarUrl(userProfileRepository.findByUserId(memberToUpdate.getUser().getId())
                                                .map(profile -> profile.getAvatarUrl())
                                                .orElse(null))
                                .role(memberToUpdate.getRole())
                                .joinedAt(memberToUpdate.getJoinedAt())
                                .build();
        }
}
