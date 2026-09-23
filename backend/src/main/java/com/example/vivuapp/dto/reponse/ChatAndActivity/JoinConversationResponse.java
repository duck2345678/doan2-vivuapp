package com.example.vivuapp.dto.reponse.ChatAndActivity;

import com.example.vivuapp.enums.JoinRequestStatus;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record JoinConversationResponse(
                Long id,
                String conversationId,
                Long userId,
                JoinRequestStatus status,
                LocalDateTime createdAt) {
}
