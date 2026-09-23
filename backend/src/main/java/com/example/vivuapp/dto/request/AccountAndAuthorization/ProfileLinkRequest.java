package com.example.vivuapp.dto.request.AccountAndAuthorization;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

/**
 * Request DTO for profile custom links
 */
public record ProfileLinkRequest(
        String id,

        @NotBlank(message = "Link title is required") String title,

        @NotBlank(message = "Link URL is required") @URL(message = "Invalid URL format") String url) {
}
