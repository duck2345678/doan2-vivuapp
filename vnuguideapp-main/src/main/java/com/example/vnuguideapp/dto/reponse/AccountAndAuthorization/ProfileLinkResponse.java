package com.example.vnuguideapp.dto.reponse.AccountAndAuthorization;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

/**
 * Response DTO for profile custom links
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProfileLinkResponse(
        String id,
        String title,
        String url) {
}
