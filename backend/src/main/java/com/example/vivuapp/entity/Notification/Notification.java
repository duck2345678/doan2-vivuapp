package com.example.vivuapp.entity.Notification;

import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notification_recipient", columnList = "recipient_id"),
        @Index(name = "idx_notification_created_at", columnList = "createdAt")
})
@EntityListeners(AuditingEntityListener.class)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Người nhận thông báo
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    /**
     * Người thực hiện hành động (có thể null cho system notifications)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    /**
     * Loại thông báo
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    /**
     * Tiêu đề thông báo
     */
    @Column(nullable = false, length = 255)
    private String title;

    /**
     * Nội dung chi tiết
     */
    @Column(columnDefinition = "TEXT")
    private String message;

    /**
     * Đã đọc chưa
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    // Reference IDs (polymorphic references to related entities)
    private Long referencePostId;

    private Long referenceCommentId;

    private String referenceConversationId;

    private Long referenceUserId;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
