package com.example.vnuguideapp.dto.request.ChatAndActivity;

public record MarkReadRequest(
        String conversationId,
        Long messageId
) {
}
