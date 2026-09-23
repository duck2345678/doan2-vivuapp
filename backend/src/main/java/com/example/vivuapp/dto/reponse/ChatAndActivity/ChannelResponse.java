package com.example.vivuapp.dto.reponse.ChatAndActivity;

import com.example.vivuapp.enums.ChannelCategory;
import com.example.vivuapp.enums.ChannelPrivacy;
import com.example.vivuapp.enums.ChannelType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ChannelResponse(
                Long id,
                String name,
                String description,
                ChannelPrivacy privacy,
                ChannelType channelType,
                ChannelCategory category,
                Boolean allowSharing,
                String avatarUrl,
                String conversationId,
                Long creatorId,
                int memberCount,
                String inviteCode,
                Boolean isJoined,
                LocalDateTime createdAt) {
}
