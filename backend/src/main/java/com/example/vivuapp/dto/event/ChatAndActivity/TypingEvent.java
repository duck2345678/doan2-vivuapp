package com.example.vivuapp.dto.event.ChatAndActivity;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TypingEvent {
    private Long userId;
    private String userName;
    private String conversationId;

    @JsonAlias("typing") // Accept cả "typing" và "isTyping"
    private Boolean isTyping;
}
