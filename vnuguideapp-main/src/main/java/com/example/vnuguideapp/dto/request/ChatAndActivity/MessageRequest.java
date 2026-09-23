package com.example.vnuguideapp.dto.request.ChatAndActivity;

import com.example.vnuguideapp.enums.MessageType;

public record MessageRequest(
        String content,
        Long replyToId,
        String ConversationId
) {
}
