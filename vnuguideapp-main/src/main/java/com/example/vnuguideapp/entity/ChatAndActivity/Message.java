package com.example.vnuguideapp.entity.ChatAndActivity;

import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.enums.MessageType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
@EntityListeners(AuditingEntityListener.class)
@Builder
@Table(name = "messages", uniqueConstraints = {
        @UniqueConstraint(name = "uk_message_idempotency", columnNames = { "conversation_id", "client_message_id" })
})
public class Message {

    @Id
    @SequenceGenerator(name = "msg_seq", sequenceName = "msg_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "msg_seq")
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    private MessageType type;

    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MessageAttachment> attachments = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Builder.Default
    private Boolean isActive = true;

    // Hỗ trợ Reply tin nhắn
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    private Message replyTo;

    // Hỗ trợ Share Post (nullable - chỉ có khi type = SHARED_POST)
    @Column(name = "shared_post_id")
    private Long sharedPostId;

    // Client-generated message ID for idempotency
    // Prevents duplicate messages when client retries failed sends
    @Column(name = "client_message_id", length = 255)
    private String clientMessageId;

    @CreatedDate
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    // Helper method để lấy file URLs
    public List<String> getFileUrls() {
        if (attachments == null)
            return new ArrayList<>();
        return attachments.stream()
                .map(a -> a.getFile().getFileUrl())
                .toList();
    }
}
