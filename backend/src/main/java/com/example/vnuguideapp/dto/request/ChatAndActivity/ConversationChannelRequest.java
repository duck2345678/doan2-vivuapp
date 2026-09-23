package com.example.vnuguideapp.dto.request.ChatAndActivity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ConversationChannelRequest(
        @NotBlank(message = "title cannot be blank")
        String title,

        @NotEmpty(message = "Participants cannot be empty")
        List<Long> participantIds
) {

}
