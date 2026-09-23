package com.example.vivuapp.entity.PostAndInteractions;

import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.ChatAndActivity.Conversation;
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
@Table(name = "post_shares")
@EntityListeners(AuditingEntityListener.class)
public class PostShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @ManyToOne(optional = false)
    @JoinColumn(name = "shared_by_user_id")
    private User sharedByUser;

    @ManyToOne
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    @ManyToOne
    @JoinColumn(name = "target_channel_id")
    private Conversation targetConversation;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime sharedAt;
}

