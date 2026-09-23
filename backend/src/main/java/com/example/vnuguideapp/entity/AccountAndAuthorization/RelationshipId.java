package com.example.vnuguideapp.entity.AccountAndAuthorization;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;

/**
 * Composite primary key for Relationship entity.
 * Uses (requesterId, addresseeId) pair as the unique identifier.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RelationshipId implements Serializable {

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "addressee_id", nullable = false)
    private Long addresseeId;

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        RelationshipId that = (RelationshipId) o;
        return Objects.equals(requesterId, that.requesterId) &&
                Objects.equals(addresseeId, that.addresseeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(requesterId, addresseeId);
    }
}
