package com.example.vivuapp.ws.AI;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AIProgressSessionRegistryTest {

    @Test
    void registerFindAndRemove() {
        AIProgressSessionRegistry registry = new AIProgressSessionRegistry();

        registry.register("req-1", "session-1", "user@example.com");

        var context = registry.find("req-1").orElseThrow();
        assertEquals("req-1", context.requestId());
        assertEquals("session-1", context.sessionId());
        assertEquals("user@example.com", context.principalName());

        registry.remove("req-1");
        assertTrue(registry.find("req-1").isEmpty());
    }

    @Test
    void registerRejectsBlankIdentifiers() {
        AIProgressSessionRegistry registry = new AIProgressSessionRegistry();

        assertThrows(IllegalArgumentException.class,
                () -> registry.register("", "session-1", "user@example.com"));
        assertThrows(IllegalArgumentException.class,
                () -> registry.register("req-1", "", "user@example.com"));
        assertThrows(IllegalArgumentException.class,
                () -> registry.register("req-1", "session-1", ""));
    }
}
