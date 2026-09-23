package com.example.vnuguideapp.entity.AccountAndAuthorization;

import com.example.vnuguideapp.entity.PlaceAndMapping.Area;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_profiles")
@EntityListeners(AuditingEntityListener.class)
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, length = 150)
    private String displayName;

    private String avatarUrl;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @ManyToOne
    @JoinColumn(name = "area_id")
    private Area area;

    private String bio;

    @Column(name = "podcast_url", length = 500)
    private String podcastUrl;

    @Column(name = "is_private")
    @Builder.Default
    private Boolean isPrivate = false;

    // Interests stored as JSON array in TEXT column
    @Column(name = "interests", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private List<String> interests = new ArrayList<>();

    // Custom links relationship
    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<ProfileLink> links = new ArrayList<>();

    @CreatedDate
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(insertable = false)
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false, nullable = false)
    private Long createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", insertable = false)
    private Long updatedBy;

    // Helper methods for managing links
    public void addLink(ProfileLink link) {
        links.add(link);
        link.setProfile(this);
    }

    public void removeLink(ProfileLink link) {
        links.remove(link);
        link.setProfile(null);
    }

    public void clearLinks() {
        links.forEach(link -> link.setProfile(null));
        links.clear();
    }
}
