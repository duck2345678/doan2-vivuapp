package com.example.vivuapp.repository;

import com.example.vivuapp.entity.Notification.Notification;
import com.example.vivuapp.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Get notifications for a user with pagination, ordered by creation date
     * (newest first)
     */
    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    /**
     * Get unread notifications for a user
     */
    List<Notification> findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(Long recipientId);

    /**
     * Count unread notifications for a user
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.recipient.id = :userId AND n.isRead = false")
    long countUnreadByUserId(@Param("userId") Long userId);

    /**
     * Mark all notifications as read for a user
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient.id = :userId AND n.isRead = false")
    int markAllAsReadByUserId(@Param("userId") Long userId);

    /**
     * Check if a similar notification already exists (to prevent duplicates)
     * For example: prevent multiple "X liked your post" notifications from the same
     * user
     */
    @Query("SELECT COUNT(n) > 0 FROM Notification n WHERE n.recipient.id = :recipientId " +
            "AND n.actor.id = :actorId AND n.type = :type " +
            "AND n.referencePostId = :postId")
    boolean existsByRecipientAndActorAndTypeAndPost(
            @Param("recipientId") Long recipientId,
            @Param("actorId") Long actorId,
            @Param("type") NotificationType type,
            @Param("postId") Long postId);

    /**
     * Delete old notifications (for cleanup job)
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :beforeDate")
    int deleteOlderThan(@Param("beforeDate") java.time.LocalDateTime beforeDate);
}
