package com.example.vivuapp.controller.ChatAndActivity;

import com.example.vivuapp.dto.event.ChatAndActivity.TypingEvent;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.service.ChatAndActivity.MessageService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Typing", description = "APIs for handling typing indicators")
public class TypingController {

    private final MessageService messageService;

    @MessageMapping("/typing/{conversationId}")
    public void handleTyping(
            Principal principal,
            @DestinationVariable String conversationId,
            @Payload TypingEvent typingEvent) {
        log.info("=== TYPING EVENT RECEIVED ===");
        log.info("Principal: {}", principal);
        log.info("ConversationId: {}", conversationId);
        log.info("TypingEvent: {}", typingEvent);

        if (principal == null) {
            log.error("Principal is NULL - Authentication failed in WebSocket!");
            return;
        }

        // Lấy User từ Principal (đã được set trong WebSocketAuthInterceptor)
        User user = null;
        if (principal instanceof UsernamePasswordAuthenticationToken authToken) {
            Object principalObj = authToken.getPrincipal();
            if (principalObj instanceof User) {
                user = (User) principalObj;
            }
        }

        if (user == null) {
            log.error("Could not extract User from Principal");
            return;
        }

        log.info("User extracted: {}", user.getEmail());
        messageService.handleTypingEvent(user, conversationId, typingEvent);
    }
}
