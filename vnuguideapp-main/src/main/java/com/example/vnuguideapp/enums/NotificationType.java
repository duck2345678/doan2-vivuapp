package com.example.vnuguideapp.enums;

/**
 * Types of notifications in the VNUGuide app
 */
public enum NotificationType {
    // Post interactions
    POST_REACTION, // Ai đó đã thích bài viết của bạn
    POST_COMMENT, // Ai đó đã bình luận bài viết của bạn
    COMMENT_REPLY, // Ai đó đã trả lời bình luận của bạn

    // Relationships
    FRIEND_REQUEST, // Ai đó gửi lời mời kết bạn
    FRIEND_ACCEPTED, // Lời mời kết bạn được chấp nhận

    // Channel
    CHANNEL_INVITE, // Bạn được mời vào channel
    JOIN_REQUEST_ACCEPTED, // Yêu cầu tham gia channel được duyệt
    JOIN_REQUEST_REJECTED, // Yêu cầu tham gia channel bị từ chối

    // Admin actions
    ADMIN_WARNING, // Admin đã gửi cảnh báo cho bạn
    POST_REMOVED // Bài viết của bạn bị gỡ bỏ
}
