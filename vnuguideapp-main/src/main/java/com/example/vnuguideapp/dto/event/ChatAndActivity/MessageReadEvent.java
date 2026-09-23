package com.example.vnuguideapp.dto.event.ChatAndActivity;

public record MessageReadEvent(
        Long userId,
        Long lastReadMessageId
) {
}
