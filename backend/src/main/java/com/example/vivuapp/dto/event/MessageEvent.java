package com.example.vivuapp.dto.event;

import com.example.vivuapp.enums.MessageEventType;

public record MessageEvent <T>(
        MessageEventType eventType,
        T data
) {
}
