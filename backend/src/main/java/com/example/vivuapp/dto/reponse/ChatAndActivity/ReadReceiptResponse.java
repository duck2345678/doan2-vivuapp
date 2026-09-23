package com.example.vivuapp.dto.reponse.ChatAndActivity;

import lombok.Builder;

@Builder
public record ReadReceiptResponse(
        Long userId,
        String fullName,
        String avatarUrl
) {
}
