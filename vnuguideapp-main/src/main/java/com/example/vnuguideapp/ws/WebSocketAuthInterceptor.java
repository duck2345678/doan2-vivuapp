package com.example.vnuguideapp.ws;

import com.example.vnuguideapp.config.JwtService;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.repository.ChatAndActivity.ParticipantRepository;
import com.example.vnuguideapp.token.TokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final TokenRepository tokenRepository;
    private final ParticipantRepository participantRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) return message;


        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            return handleConnect(accessor, message);
        }


        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return handleSubscribe(accessor, message);
        }

        return message;
    }


    private Message<?> handleConnect(StompHeaderAccessor accessor, Message<?> message) {
        final List<String> authorization = accessor.getNativeHeader("Authorization");

        if (authorization == null || authorization.isEmpty()) {
            log.warn("WebSocket Auth: Missing Authorization Header");
            return null;
        }

        String token = authorization.get(0);
        if (!token.startsWith("Bearer ")) {
            log.warn("WebSocket Auth: Invalid Token Format");
            return null;
        }

        final String jwt = token.substring(7);
        final String userEmail;

        try {
            userEmail = jwtService.extractUsername(jwt);
        } catch (Exception e) {
            log.error("WebSocket Auth: Cannot parse token - {}", e.getMessage());
            return null;
        }

        if (userEmail != null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

            if (userDetails instanceof User user) {
                var isTokenValid = tokenRepository.findByToken(jwt)
                        .map(t -> !t.isExpired() && !t.isRevoked())
                        .orElse(false);

                // Validate tổng thể
                if (jwtService.isTokenValid(jwt, user) && isTokenValid) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

                    // Set User vào Session của WebSocket
                    accessor.setUser(authToken);
                    log.info("WebSocket Connected: {}", userEmail);
                    return message;
                }
            }
        }

        log.warn("WebSocket Auth: Token invalid or revoked for user {}", userEmail);
        return null;
    }

    private Message<?> handleSubscribe(StompHeaderAccessor accessor, Message<?> message) {
        String destination = accessor.getDestination();
        Principal userPrincipal = accessor.getUser();

        if (userPrincipal == null || destination == null) return null;

        // Kiểm tra quyền subscribe vào /topic/message.{conversationId}
        if (destination.startsWith("/topic/message.")) {
            String conversationId = destination.substring("/topic/message.".length());
            Long userId = getUserIdFromPrincipal(userPrincipal);

            if (userId != null) {
                boolean isParticipant = participantRepository.existsByConversationIdAndUserId(conversationId, userId);
                if (!isParticipant) {
                    log.warn("Access Denied: User {} tried to subscribe to conversation {}", userId, conversationId);
                    return null;
                }
            }
        }

        // Kiểm tra quyền subscribe vào /topic/typing.{conversationId}
        if (destination.startsWith("/topic/typing.")) {
            String conversationId = destination.substring("/topic/typing.".length());
            Long userId = getUserIdFromPrincipal(userPrincipal);

            if (userId != null) {
                boolean isParticipant = participantRepository.existsByConversationIdAndUserId(conversationId, userId);
                if (!isParticipant) {
                    log.warn("Access Denied: User {} tried to subscribe to typing events for conversation {}", userId, conversationId);
                    return null;
                }
            }
        }

        return message;
    }

    private Long getUserIdFromPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof User user) {
            return user.getId();
        }
        return null;
    }
}