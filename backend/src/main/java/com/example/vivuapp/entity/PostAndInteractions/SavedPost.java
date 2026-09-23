package com.example.vivuapp.entity.PostAndInteractions;

import com.example.vivuapp.entity.AccountAndAuthorization.User;
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
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "saved_posts",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_saved_posts",
        columnNames = {"user_id", "post_id"}
    )
)
public class SavedPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime savedAt;
}

