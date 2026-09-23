package com.example.vnuguideapp.dto.event;

import com.example.vnuguideapp.enums.MessageEventType;

public record MessageEvent <T>(
        MessageEventType eventType,
        T data
) {
}
