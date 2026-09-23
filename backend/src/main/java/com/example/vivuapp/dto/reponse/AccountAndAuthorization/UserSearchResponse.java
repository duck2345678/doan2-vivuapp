package com.example.vivuapp.dto.reponse.AccountAndAuthorization;

import com.example.vivuapp.enums.RelationshipStatus;
import lombok.Builder;

@Builder
public record UserSearchResponse(
        Long id,
        String username,
        String displayName,
        String email,
        String avatarUrl,
        RelationshipStatus relationshipStatus
) {
}
