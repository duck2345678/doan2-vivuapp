package com.example.vivuapp.dto.reponse.ChatAndActivity;

import com.example.vivuapp.enums.ParticipantRole;
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
