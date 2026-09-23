package com.example.vivuapp.entity.ChatAndActivity;

import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.enums.ParticipantRole;
import com.example.vivuapp.enums.ParticipantStatus;
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
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "participants", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "conversation_id" })
})
public class Participant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // Quyền hạn: MEMBER, ADMIN (có quyền kick user), OWNER
    @Enumerated(EnumType.STRING)
    private ParticipantRole role;

    @CreatedDate
    private LocalDateTime joinedAt;

    // Quan trọng: Con trỏ đọc tin nhắn (Read Receipt Logic)
    // Lưu ID tin nhắn cuối cùng mà user này đã đọc trong cuộc hội thoại này
    // Cách này tối ưu hơn việc tạo bảng "MessageReadStatus" cho từng tin nhắn
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_read_message_id")
    private Message lastReadMessage;

    // INBOX/REQUEST routing: determines if conversation appears in inbox or message
    // requests
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ParticipantStatus status = ParticipantStatus.INBOX;

    // Unread message count for this participant in this conversation
    @Builder.Default
    private Integer unreadCount = 0;

    // Timestamp when user soft-deleted this conversation (status = DELETED)
    // Used for audit trail and potential data recovery
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

}
