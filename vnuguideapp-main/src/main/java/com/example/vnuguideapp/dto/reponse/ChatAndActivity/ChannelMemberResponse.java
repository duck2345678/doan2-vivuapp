package com.example.vnuguideapp.dto.reponse.ChatAndActivity;

import com.example.vnuguideapp.enums.ParticipantRole;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ChannelMemberResponse(
    Long userId,
    String userName,
    String avatarUrl,
    ParticipantRole role,
    LocalDateTime joinedAt) {
}
