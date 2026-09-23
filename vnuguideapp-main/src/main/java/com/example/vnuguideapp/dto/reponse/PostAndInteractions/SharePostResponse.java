package com.example.vnuguideapp.dto.reponse.PostAndInteractions;

import com.example.vnuguideapp.enums.MessageType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record SharePostResponse(
    Long messageId,
    Long postId,
    String conversationId,
    Long senderId,
    String senderName,
    String message,
    MessageType messageType,
    LocalDateTime timestamp) {
}
