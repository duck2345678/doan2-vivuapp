package com.example.vnuguideapp.dto.reponse.ChatAndActivity;

import lombok.Builder;

@Builder
public record ReadReceiptResponse(
        Long userId,
        String fullName,
        String avatarUrl
) {
}
