package com.example.vnuguideapp.dto.reponse.ChatAndActivity;

import com.example.vnuguideapp.enums.ParticipantStatus;
import com.example.vnuguideapp.enums.RelationshipStatus;
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
