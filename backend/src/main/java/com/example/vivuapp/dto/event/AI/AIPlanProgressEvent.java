package com.example.vivuapp.dto.event.AI;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.time.Instant;

/**
 * Public realtime progress event sent to the authenticated mobile client.
 * It intentionally carries only user-safe workflow status; never model
 * chain-of-thought, prompts, hidden tool arguments, or internal stack traces.
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AIPlanProgressEvent(
        String type,
        String sessionId,
        String requestId,
        String agent,
        String status,
        String message,
        Integer loopCount,
        String timestamp) {

    public static AIPlanProgressEvent of(
            String type,
            String sessionId,
            String requestId,
            String agent,
            String status,
            String message,
            Integer loopCount) {
        return AIPlanProgressEvent.builder()
                .type(type)
                .sessionId(sessionId)
                .requestId(requestId)
                .agent(agent)
                .status(status)
                .message(message)
                .loopCount(loopCount)
                .timestamp(Instant.now().toString())
                .build();
    }
}
