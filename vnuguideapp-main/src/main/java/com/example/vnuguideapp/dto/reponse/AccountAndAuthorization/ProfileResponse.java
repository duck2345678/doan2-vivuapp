package com.example.vnuguideapp.dto.reponse.AccountAndAuthorization;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for user profile data
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProfileResponse(
        Long id,
        Long userId,
        String username,
        String displayName,
        String bio,
        String avatarUrl,
        String coverUrl,
        Integer postsCount,
        Integer followersCount,
        Integer followingCount,
        Boolean isFollowing,
        List<String> interests,
        List<ProfileLinkResponse> links,
        String podcastUrl,
        Boolean isPrivate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
