package com.example.vivuapp.ws.AI;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks an in-flight AI request so an internal Python progress callback can
 * be routed to the authenticated WebSocket principal that initiated it.
 */
@Component
@Slf4j
public class AIProgressSessionRegistry {

    private final ConcurrentHashMap<String, SessionContext> sessions = new ConcurrentHashMap<>();

    public void register(String requestId, String sessionId, String principalName) {
        if (requestId == null || requestId.isBlank()) {
            throw new IllegalArgumentException("requestId must not be blank");
        }
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId must not be blank");
        }
        if (principalName == null || principalName.isBlank()) {
            throw new IllegalArgumentException("principalName must not be blank");
        }

        sessions.put(requestId, new SessionContext(requestId, sessionId, principalName, Instant.now()));
    }

    public Optional<SessionContext> find(String requestId) {
        if (requestId == null || requestId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(sessions.get(requestId));
    }

    public void remove(String requestId) {
        if (requestId != null && !requestId.isBlank()) {
            sessions.remove(requestId);
        }
    }

    public record SessionContext(
            String requestId,
            String sessionId,
            String principalName,
            Instant registeredAt) {
    }
}
