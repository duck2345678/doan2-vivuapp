package com.example.vivuapp.dto.reponse.ChatAndActivity;

import com.example.vivuapp.enums.MessageType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record MessageSearchResponse(
    Long id,
    String conversationId,
    String conversationName,
    Long senderId,
    String senderName,
    String senderAvatar,
    String content,
    MessageType messageType,
    List<String> fileUrls,
    LocalDateTime timestamp) {
}
