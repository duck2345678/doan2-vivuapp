package com.example.vivuapp.dto.request.ChatAndActivity;

public record MarkReadRequest(
        String conversationId,
        Long messageId
) {
}
