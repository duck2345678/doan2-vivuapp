package com.example.vivuapp.ws;

import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vivuapp.service.ChatAndActivity.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final PresenceService presenceService;
    private final UserRepository userRepository;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();
        
        User user = extractUser(principal);
        if (user != null) {
            presenceService.markUserOnline(user.getId());
            presenceService.sendBulkPresenceUpdate(user.getId());
            log.info("User {} connected via WebSocket", user.getId());
        } else {
            log.warn("WebSocket connection with no authenticated user");
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();
        
        User user = extractUser(principal);
        if (user != null) {
            presenceService.markUserOffline(user.getId());
            log.info("User {} disconnected from WebSocket", user.getId());
        }
    }

    private User extractUser(Principal principal) {
        if (principal == null) {
            return null;
        }

        if (principal instanceof UsernamePasswordAuthenticationToken token) {
            Object principalObj = token.getPrincipal();
            if (principalObj instanceof User user) {
                return user;
            }
            
            String identifier = principal.getName();
            try {
                Long userId = Long.parseLong(identifier);
                return userRepository.findById(userId).orElse(null);
            } catch (NumberFormatException e) {
                return userRepository.findByEmail(identifier).orElse(null);
            }
        }

        String identifier = principal.getName();
        try {
            Long userId = Long.parseLong(identifier);
            return userRepository.findById(userId).orElse(null);
        } catch (NumberFormatException e) {
            return userRepository.findByEmail(identifier).orElse(null);
        }
    }
}
