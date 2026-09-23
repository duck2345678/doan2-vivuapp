package com.example.vnuguideapp.dto.reponse.ChatAndActivity;

import com.example.vnuguideapp.enums.JoinRequestStatus;
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
