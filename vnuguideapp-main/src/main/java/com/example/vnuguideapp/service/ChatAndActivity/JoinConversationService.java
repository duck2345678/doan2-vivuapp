package com.example.vnuguideapp.service.ChatAndActivity;

import com.example.vnuguideapp.dto.event.MessageEvent;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.ChannelResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.JoinConversationResponse;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.ChatAndActivity.JoinConversation;
import com.example.vnuguideapp.entity.ChatAndActivity.Participant;
import com.example.vnuguideapp.enums.JoinRequestStatus;
import com.example.vnuguideapp.enums.MessageEventType;
import com.example.vnuguideapp.enums.ParticipantRole;
import com.example.vnuguideapp.exception.exceptionImpl.BadRequestException;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.ChatAndActivity.ConversationRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.JoinConversationRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ParticipantRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ChannelRepository;
import com.example.vnuguideapp.service.Notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class JoinConversationService {

        JoinConversationRepository joinConversationRepository;
        ConversationRepository conversationRepository;
        ParticipantRepository participantRepository;
        ChannelRepository channelRepository;
        SimpMessagingTemplate messagingTemplate;
        @Lazy
        NotificationService notificationService;

        public JoinConversationResponse sendJoinConversationRequest(User user, String conversationId) {

                // 1. Early return với orElseThrow
                var conversation = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Conversation not found: " + conversationId));

                // 2. Check nếu user đã là participant
                if (participantRepository.existsByConversationIdAndUserId(conversationId, user.getId())) {
                        throw new BadRequestException("You are already a member of this conversation");
                }

                // 3. Check nếu đã có pending request
                if (joinConversationRepository.existsPendingRequest(user.getId(), conversationId)) {
                        throw new BadRequestException("You already have a pending join request");
                }

                // 4. Tạo và lưu request
                JoinConversation joinConversation = JoinConversation.builder()
                                .user(user)
                                .conversation(conversation)
                                .build();

                JoinConversation saved = joinConversationRepository.save(joinConversation);

                JoinConversationResponse response = JoinConversationResponse.builder()
                                .id(saved.getId())
                                .userId(saved.getUser().getId())
                                .conversationId(saved.getConversation().getId())
                                .status(saved.getStatus())
                                .createdAt(saved.getCreatedAt())
                                .build();

                // 5. Notify admins
                participantRepository.findByConversationIdAndRole(conversationId, ParticipantRole.ADMIN)
                                .forEach(admin -> messagingTemplate.convertAndSendToUser(
                                                admin.getUser().getEmail(),
                                                "/queue/join-conversation",
                                                new MessageEvent<>(MessageEventType.SEND_JOIN_REQUEST, response)));

                return response;
        }

        public JoinConversationResponse acceptJoinRequest(User user, Long joinRequestId) {

                // 1. Find join request
                JoinConversation joinRequest = joinConversationRepository.findById(joinRequestId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Join request not found: " + joinRequestId));

                // 2. Check đã được accept chưa
                if (joinRequest.getStatus() == JoinRequestStatus.ACCEPTED) {
                        throw new BadRequestException("This join request has already been accepted");
                }

                // 3. Check user có phải admin của conversation không
                boolean isAdmin = participantRepository.existsByConversationIdAndUserIdAndRole(
                                joinRequest.getConversation().getId(),
                                user.getId(),
                                ParticipantRole.ADMIN);

                if (!isAdmin) {
                        throw new BadRequestException("Only admins can accept join requests");
                }

                // 4. Accept request
                joinRequest.setStatus(JoinRequestStatus.ACCEPTED);
                JoinConversation saved = joinConversationRepository.save(joinRequest);

                // 5. Add user as member
                Participant newParticipant = Participant.builder()
                                .user(joinRequest.getUser())
                                .conversation(joinRequest.getConversation())
                                .role(ParticipantRole.MEMBER)
                                .build();
                participantRepository.save(newParticipant);

                // Update channel member count and broadcast
                Long memberCount = participantRepository.countByConversationId(joinRequest.getConversation().getId());
                channelRepository.findByConversationId(joinRequest.getConversation().getId()).ifPresent(channel -> {
                    channel.setMemberCount(memberCount);
                    channelRepository.save(channel);

                    // Broadcast update
                    ChannelResponse channelResponse = ChannelResponse.builder()
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

                    messagingTemplate.convertAndSend("/topic/channel." + joinRequest.getConversation().getId(),
                        new MessageEvent<>(MessageEventType.CHANNEL_CHANGED, channelResponse));
                });

                // 6. Build response
                JoinConversationResponse response = JoinConversationResponse.builder()
                                .id(saved.getId())
                                .userId(saved.getUser().getId())
                                .conversationId(saved.getConversation().getId())
                                .status(saved.getStatus())
                                .createdAt(saved.getCreatedAt())
                                .build();

                // 7. Notify requester via WebSocket
                messagingTemplate.convertAndSendToUser(
                                joinRequest.getUser().getEmail(),
                                "/queue/join-conversation",
                                new MessageEvent<>(MessageEventType.ACCEPT_JOIN_REQUEST, response));

                // 8. Send notification to requester
                String channelName = channelRepository.findByConversationId(joinRequest.getConversation().getId())
                                .map(ch -> ch.getName())
                                .orElse("Kênh");
                notificationService.notifyJoinRequestAccepted(
                                joinRequest.getUser(), user,
                                joinRequest.getConversation().getId(), channelName);

                return response;
        }

        public JoinConversationResponse rejectJoinRequest(User user, Long joinRequestId) {
                // 1. Find join request
                JoinConversation joinRequest = joinConversationRepository.findById(joinRequestId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Join request not found: " + joinRequestId));

                // 2. Verify user has permission (must be ADMIN)
                boolean isAdmin = participantRepository
                                .findByConversationIdAndUserId(joinRequest.getConversation().getId(), user.getId())
                                .map(p -> p.getRole() == ParticipantRole.ADMIN)
                                .orElse(false);

                if (!isAdmin) {
                        throw new BadRequestException("Only admins can reject join requests");
                }

                // 3. Update status to REJECTED
                joinRequest.setStatus(JoinRequestStatus.REJECTED);
                JoinConversation saved = joinConversationRepository.save(joinRequest);

                // 4. Build response
                JoinConversationResponse response = JoinConversationResponse.builder()
                                .id(saved.getId())
                                .conversationId(saved.getConversation().getId())
                                .userId(saved.getUser().getId())
                                .status(saved.getStatus())
                                .createdAt(saved.getCreatedAt())
                                .build();

                // 5. Notify the requester via WebSocket
                messagingTemplate.convertAndSendToUser(
                                saved.getUser().getEmail(),
                                "/queue/join-conversation",
                                new MessageEvent<>(MessageEventType.REJECT_JOIN_REQUEST, response));

                // 6. Send notification to requester
                String channelName = channelRepository.findByConversationId(saved.getConversation().getId())
                                .map(ch -> ch.getName())
                                .orElse("Kênh");
                notificationService.notifyJoinRequestRejected(
                                saved.getUser(), user,
                                saved.getConversation().getId(), channelName);

                return response;
        }
}
