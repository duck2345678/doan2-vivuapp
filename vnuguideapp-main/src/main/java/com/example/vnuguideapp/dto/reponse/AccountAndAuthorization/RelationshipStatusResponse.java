package com.example.vnuguideapp.dto.reponse.AccountAndAuthorization;

import com.example.vnuguideapp.enums.RelationshipStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Response DTO for relationship status between two users.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RelationshipStatusResponse {

    /**
     * The target user ID.
     */
    Long targetUserId;

    /**
     * The relationship status from the current user's perspective.
     */
    RelationshipStatus status;

    /**
     * Whether the users are friends (status = ACCEPTED).
     */
    boolean areFriends;
}
