package com.example.vivuapp.dto.request.AccountAndAuthorization;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request DTO for updating user profile
 */
public record UpdateProfileRequest(
        @Size(min = 1, max = 50, message = "Display name must be between 1 and 50 characters") String displayName,

        @Size(max = 150, message = "Bio must not exceed 150 characters") String bio,

        String avatarUrl,

        String coverUrl,

        @Size(max = 10, message = "Maximum 10 interests allowed") List<String> interests,

        @Valid List<ProfileLinkRequest> links,

        String podcastUrl,

        Boolean isPrivate) {
}
