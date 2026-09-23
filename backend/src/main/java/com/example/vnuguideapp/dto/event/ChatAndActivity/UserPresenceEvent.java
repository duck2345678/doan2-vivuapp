package com.example.vnuguideapp.dto.event.ChatAndActivity;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserPresenceEvent {

    Long userId;

    String displayName;

    boolean isOnline;

    LocalDateTime lastSeen;
}
