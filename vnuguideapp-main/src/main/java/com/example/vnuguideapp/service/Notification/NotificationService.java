package com.example.vnuguideapp.service.Notification;

import com.example.vnuguideapp.dto.reponse.NotificationResponse;
import com.example.vnuguideapp.dto.reponse.PageResponse;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vnuguideapp.entity.Notification.Notification;
import com.example.vnuguideapp.enums.NotificationType;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.NotificationRepository;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserProfileRepository userProfileRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Create and save a notification, then push it via WebSocket
     */
    @Transactional
    public Notification createNotification(
            User recipient,
            User actor,
            NotificationType type,
            String title,
            String message,
            Long referencePostId,
            Long referenceCommentId,
            String referenceConversationId,
            Long referenceUserId) {
        // Don't create notification if recipient is the actor (self-action)
        if (actor != null && recipient.getId().equals(actor.getId())) {
            log.debug("Skipping self-notification for user {}", recipient.getId());
            return null;
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .actor(actor)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .referencePostId(referencePostId)
                .referenceCommentId(referenceCommentId)
                .referenceConversationId(referenceConversationId)
                .referenceUserId(referenceUserId)
                .build();

        notification = notificationRepository.save(notification);
        log.info("Created notification {} for user {}", notification.getId(), recipient.getId());

        // Push real-time notification via WebSocket
        sendRealtimeNotification(notification);

        return notification;
    }

    /**
     * Push notification via WebSocket to user's personal queue
     */
    private void sendRealtimeNotification(Notification notification) {
        try {
            NotificationResponse response = mapToResponse(notification);
            String destination = "/queue/notifications";
            messagingTemplate.convertAndSendToUser(
                    notification.getRecipient().getId().toString(),
                    destination,
                    response);
            log.debug("Sent real-time notification to user {}", notification.getRecipient().getId());
        } catch (Exception e) {
            log.error("Failed to send real-time notification: {}", e.getMessage());
        }
    }

    /**
     * Get paginated notifications for a user
     */
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getNotifications(Long userId, int page, int size) {
        Page<Notification> notificationPage = notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));

        return PageResponse.<NotificationResponse>builder()
                .data(notificationPage.getContent().stream()
                        .map(this::mapToResponse)
                        .toList())
                .page(page)
                .size(size)
                .total(notificationPage.getTotalElements())
                .build();
    }

    /**
     * Get unread notification count for a user
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    /**
     * Mark a single notification as read
     */
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getRecipient().getId().equals(userId)) {
            throw new ResourceNotFoundException("Notification not found");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);
        log.debug("Marked notification {} as read", notificationId);
    }

    /**
     * Mark all notifications as read for a user
     */
    @Transactional
    public int markAllAsRead(Long userId) {
        int count = notificationRepository.markAllAsReadByUserId(userId);
        log.info("Marked {} notifications as read for user {}", count, userId);
        return count;
    }

    /**
     * Delete a notification
     */
    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getRecipient().getId().equals(userId)) {
            throw new ResourceNotFoundException("Notification not found");
        }

        notificationRepository.delete(notification);
        log.debug("Deleted notification {}", notificationId);
    }

    /**
     * Map entity to response DTO
     */
    private NotificationResponse mapToResponse(Notification notification) {
        NotificationResponse.ActorInfo actorInfo = null;
        if (notification.getActor() != null) {
            var profile = userProfileRepository.findByUserId(notification.getActor().getId())
                    .orElse(null);

            String displayName = notification.getActor().getFirstName() + " " + notification.getActor().getLastName();
            String avatarUrl = profile != null ? profile.getAvatarUrl() : null;

            actorInfo = NotificationResponse.ActorInfo.builder()
                    .id(notification.getActor().getId())
                    .displayName(displayName.trim())
                    .avatarUrl(avatarUrl)
                    .build();
        }

        NotificationResponse.ReferenceData referenceData = NotificationResponse.ReferenceData.builder()
                .postId(notification.getReferencePostId())
                .commentId(notification.getReferenceCommentId())
                .conversationId(notification.getReferenceConversationId())
                .userId(notification.getReferenceUserId())
                .build();

        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .isRead(notification.getIsRead())
                .actor(actorInfo)
                .reference(referenceData)
                .createdAt(notification.getCreatedAt())
                .build();
    }

    // ============ Helper methods for creating specific notification types
    // ============

    /**
     * Create POST_REACTION notification
     */
    public void notifyPostReaction(User postOwner, User reactor, Long postId, String reactionType) {
        String title = "Lượt thích mới";
        String message = reactor.getFirstName() + " đã " + reactionType + " bài viết của bạn";

        createNotification(
                postOwner, reactor, NotificationType.POST_REACTION,
                title, message, postId, null, null, null);
    }

    /**
     * Create POST_COMMENT notification
     */
    public void notifyPostComment(User postOwner, User commenter, Long postId, Long commentId, String commentPreview) {
        String title = "Bình luận mới";
        String preview = commentPreview.length() > 50 ? commentPreview.substring(0, 50) + "..." : commentPreview;
        String message = commenter.getFirstName() + " đã bình luận: \"" + preview + "\"";

        createNotification(
                postOwner, commenter, NotificationType.POST_COMMENT,
                title, message, postId, commentId, null, null);
    }

    /**
     * Create COMMENT_REPLY notification
     */
    public void notifyCommentReply(User parentCommentOwner, User replier, Long postId, Long commentId,
            String replyPreview) {
        String title = "Trả lời bình luận";
        String preview = replyPreview.length() > 50 ? replyPreview.substring(0, 50) + "..." : replyPreview;
        String message = replier.getFirstName() + " đã trả lời: \"" + preview + "\"";

        createNotification(
                parentCommentOwner, replier, NotificationType.COMMENT_REPLY,
                title, message, postId, commentId, null, null);
    }

    /**
     * Create FRIEND_REQUEST notification
     */
    public void notifyFriendRequest(User recipient, User sender) {
        String title = "Lời mời kết bạn";
        String message = sender.getFirstName() + " " + sender.getLastName() + " đã gửi lời mời kết bạn";

        createNotification(
                recipient, sender, NotificationType.FRIEND_REQUEST,
                title, message, null, null, null, sender.getId());
    }

    /**
     * Create FRIEND_ACCEPTED notification
     */
    public void notifyFriendAccepted(User originalRequester, User accepter) {
        String title = "Kết bạn thành công";
        String message = accepter.getFirstName() + " " + accepter.getLastName() + " đã chấp nhận lời mời kết bạn";

        createNotification(
                originalRequester, accepter, NotificationType.FRIEND_ACCEPTED,
                title, message, null, null, null, accepter.getId());
    }

    /**
     * Create CHANNEL_INVITE notification
     */
    public void notifyChannelInvite(User invitee, User inviter, String conversationId, String channelName) {
        String title = "Lời mời tham gia kênh";
        String message = inviter.getFirstName() + " đã mời bạn tham gia kênh \"" + channelName + "\"";

        createNotification(
                invitee, inviter, NotificationType.CHANNEL_INVITE,
                title, message, null, null, conversationId, null);
    }

    /**
     * Create JOIN_REQUEST_ACCEPTED notification
     */
    public void notifyJoinRequestAccepted(User requester, User admin, String conversationId, String channelName) {
        String title = "Yêu cầu tham gia được duyệt";
        String message = "Yêu cầu tham gia kênh \"" + channelName + "\" đã được chấp nhận";

        createNotification(
                requester, admin, NotificationType.JOIN_REQUEST_ACCEPTED,
                title, message, null, null, conversationId, null);
    }

    /**
     * Create JOIN_REQUEST_REJECTED notification
     */
    public void notifyJoinRequestRejected(User requester, User admin, String conversationId, String channelName) {
        String title = "Yêu cầu tham gia bị từ chối";
        String message = "Yêu cầu tham gia kênh \"" + channelName + "\" đã bị từ chối";

        createNotification(
                requester, admin, NotificationType.JOIN_REQUEST_REJECTED,
                title, message, null, null, conversationId, null);
    }

    /**
     * Create ADMIN_WARNING notification
     */
    public void notifyAdminWarning(User recipient, String warningMessage) {
        String title = "Cảnh báo từ quản trị viên";

        createNotification(
                recipient, null, NotificationType.ADMIN_WARNING,
                title, warningMessage, null, null, null, null);
    }

    /**
     * Create POST_REMOVED notification
     */
    public void notifyPostRemoved(User postOwner, Long postId, String reason) {
        String title = "Bài viết đã bị gỡ";
        String message = "Bài viết của bạn đã bị gỡ. Lý do: " + reason;

        createNotification(
                postOwner, null, NotificationType.POST_REMOVED,
                title, message, postId, null, null, null);
    }
}
