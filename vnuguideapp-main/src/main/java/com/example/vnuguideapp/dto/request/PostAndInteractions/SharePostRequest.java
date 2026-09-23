package com.example.vnuguideapp.dto.request.PostAndInteractions;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record SharePostRequest(
    @NotBlank String conversationId,
    String message // optional message khi share
) {
}
