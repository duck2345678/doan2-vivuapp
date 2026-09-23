package com.example.vivuapp.dto.event.ChatAndActivity;

public record MessageReadEvent(
        Long userId,
        Long lastReadMessageId
) {
}
