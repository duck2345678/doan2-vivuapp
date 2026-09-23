package com.example.vnuguideapp.entity.ChatAndActivity;

import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.Storage.FileEntity;
import com.example.vnuguideapp.enums.ConversationType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "conversations")
@EntityListeners(AuditingEntityListener.class)
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String title;

    @Enumerated(EnumType.STRING)
    private ConversationType type;

    // Avatar cho group/channel conversation (nullable)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "avatar_id")
    private FileEntity avatar;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToOne
    @JoinColumn(name = "last_message_id")
    private Message lastMessage;

    // Unique key for DIRECT conversations: "LEAST(id1,id2):GREATEST(id1,id2)"
    // Enables efficient lookup and prevents duplicate DIRECT conversations
    @Column(length = 100, unique = true)
    private String directKey;

    // Preview text for conversation list UI
    @Column(columnDefinition = "TEXT")
    private String lastMessagePreview;

    @OneToMany(mappedBy = "conversation", fetch = FetchType.LAZY)
    @Builder.Default
    List<Message> messages = new ArrayList<>();

    @OneToMany(mappedBy = "conversation", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Participant> participants = new ArrayList<>();

    // Optional: only set when type = CHANNEL
    @OneToOne(mappedBy = "conversation", fetch = FetchType.LAZY)
    private Channel channel;

}
