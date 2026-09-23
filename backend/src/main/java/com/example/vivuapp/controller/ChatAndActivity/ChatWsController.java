package com.example.vivuapp.controller.ChatAndActivity;

import com.example.vivuapp.dto.request.ChatAndActivity.ChatSendPayload;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vivuapp.service.ChatAndActivity.MessageService;
import com.example.vivuapp.service.ChatAndActivity.PresenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * WebSocket controller for real-time chat messaging.
 * Handles messages sent to /app/chat.* destinations.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWsController {

    private final MessageService messageService;
    private final UserRepository userRepository;
    private final PresenceService presenceService;

    /**
     * Handle incoming chat messages.
     * 
     * Client sends to: /app/chat.send
     * Server sends ACK to sender: /user/queue/ack
     * Server sends message to recipient: /user/queue/messages
     * Server broadcasts to topic: /topic/message.{conversationId}
     *
     * @param payload   The message payload containing content, recipientId,
     *                  clientMessageId
     * @param principal The authenticated user principal
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload @Valid ChatSendPayload payload, Principal principal) {
        User sender = extractUser(principal);
        if (sender == null) {
            log.warn("Unauthenticated WebSocket message attempt");
            return;
        }

        log.debug("WebSocket message from user {} to {}: {}",
                sender.getId(), payload.getRecipientId(), payload.getClientMessageId());

        try {
            messageService.handleIncomingMessage(sender, payload);
        } catch (Exception e) {
            log.error("Error handling WebSocket message: {}", e.getMessage(), e);
            // Send error ACK to sender
            // The handleIncomingMessage method already handles this internally
        }
    }

    /**
     * Handle heartbeat messages from clients.
     * Clients should send heartbeat every 30s to maintain online status.
     * 
     * Client sends to: /app/presence.heartbeat
     * 
     * @param principal The authenticated user principal
     */
    @MessageMapping("/presence.heartbeat")
    public void handleHeartbeat(Principal principal) {
        User user = extractUser(principal);
        if (user == null) {
            log.warn("Unauthenticated heartbeat attempt");
            return;
        }

        presenceService.updateHeartbeat(user.getId());
        log.debug("Heartbeat received from user {}", user.getId());
    }

    /**
     * Extract User from Principal.
     * Assumes the authentication token contains the User as the principal.
     */
    private User extractUser(Principal principal) {
        if (principal == null) {
            return null;
        }

        // If using JWT authentication with user ID in principal name
        if (principal instanceof UsernamePasswordAuthenticationToken token) {
            Object principalObj = token.getPrincipal();
            if (principalObj instanceof User user) {
                return user;
            }
            // Fallback: principal name might be user ID or email
            String identifier = principal.getName();
            try {
                Long userId = Long.parseLong(identifier);
                return userRepository.findById(userId).orElse(null);
            } catch (NumberFormatException e) {
                // Try by email
                return userRepository.findByEmail(identifier).orElse(null);
            }
        }

        // Fallback for other authentication types
        String identifier = principal.getName();
        try {
            Long userId = Long.parseLong(identifier);
            return userRepository.findById(userId).orElse(null);
        } catch (NumberFormatException e) {
            return userRepository.findByEmail(identifier).orElse(null);
        }
    }
}
