package com.example.vivuapp.dto.event.ChatAndActivity;

import lombok.Builder;

/**
 * Minimal payload for channel events sent to user queue.
 * Used to notify users when they are added to a channel.
 * Frontend will use this to trigger a conversation list refresh.
 */
@Builder
public record ChannelEventPayload(
        Long channelId,
        String conversationId,
        String channelName
) {
}
