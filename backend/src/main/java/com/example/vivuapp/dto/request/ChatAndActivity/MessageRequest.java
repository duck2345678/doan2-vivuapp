package com.example.vivuapp.dto.request.ChatAndActivity;

import com.example.vivuapp.enums.MessageType;

public record MessageRequest(
        String content,
        Long replyToId,
        String ConversationId
) {
}
