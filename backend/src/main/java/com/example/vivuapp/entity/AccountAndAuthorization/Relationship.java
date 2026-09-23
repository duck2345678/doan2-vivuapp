package com.example.vivuapp.entity.AccountAndAuthorization;

import com.example.vivuapp.enums.RelationshipStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Represents a relationship between two users using a two-row model.
 * 
 * Example friend request flow:
 * - User A sends request to User B:
 * - Row 1: (A, B, PENDING_OUTGOING)
 * - Row 2: (B, A, PENDING_INCOMING)
 * 
 * - User B accepts:
 * - Row 1: (A, B, ACCEPTED)
 * - Row 2: (B, A, ACCEPTED)
 * 
 * - User A blocks User B:
 * - Row 1: (A, B, BLOCKED) - kept
 * - Row 2: (B, A, *) - deleted
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "relationships", indexes = {
        @Index(name = "idx_relationship_requester", columnList = "requester_id"),
        @Index(name = "idx_relationship_addressee", columnList = "addressee_id"),
        @Index(name = "idx_relationship_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
public class Relationship {

    @EmbeddedId
    private RelationshipId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("requesterId")
    @JoinColumn(name = "requester_id", insertable = false, updatable = false)
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("addresseeId")
    @JoinColumn(name = "addressee_id", insertable = false, updatable = false)
    private User addressee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RelationshipStatus status;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /**
     * Factory method to create a pair of relationship records for a friend request.
     */
    public static Relationship[] createFriendRequestPair(Long requesterId, Long addresseeId) {
        LocalDateTime now = LocalDateTime.now();

        Relationship outgoing = Relationship.builder()
                .id(new RelationshipId(requesterId, addresseeId))
                .status(RelationshipStatus.PENDING_OUTGOING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Relationship incoming = Relationship.builder()
                .id(new RelationshipId(addresseeId, requesterId))
                .status(RelationshipStatus.PENDING_INCOMING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return new Relationship[] { outgoing, incoming };
    }
}
