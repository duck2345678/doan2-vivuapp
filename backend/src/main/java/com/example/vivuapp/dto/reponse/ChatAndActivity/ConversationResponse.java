package com.example.vivuapp.dto.reponse.ChatAndActivity;

import com.example.vivuapp.enums.ParticipantStatus;
import com.example.vivuapp.enums.RelationshipStatus;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ConversationResponse(
                String id,
                String name,
                String avatarUrl,
                long unreadCount,
                String lastMessage,
                LocalDateTime lastMessageTime,
                Long otherUserId,
                ParticipantStatus participantStatus,
                RelationshipStatus relationshipStatus) {
}
