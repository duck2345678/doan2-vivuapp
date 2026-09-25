package com.example.vivuapp.service.AI;

import com.example.vivuapp.dto.event.AI.AIPlanProgressEvent;
import com.example.vivuapp.dto.request.AI.PythonAIProgressRequest;
import com.example.vivuapp.ws.AI.AIProgressSessionRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/** Routes validated Python progress events to the user's private STOMP queue. */
@Service
@RequiredArgsConstructor
@Slf4j
public class AIProgressPublisher {

    public static final String USER_QUEUE = "/queue/ai-plan-progress";

    private final SimpMessagingTemplate messagingTemplate;

    public void publish(
            AIProgressSessionRegistry.SessionContext context,
            PythonAIProgressRequest request) {

        AIPlanProgressEvent event = AIPlanProgressEvent.of(
                request.type(),
                context.sessionId(),
                context.requestId(),
                request.agent(),
                request.status(),
                request.message(),
                request.loopCount());

        messagingTemplate.convertAndSendToUser(
                context.principalName(),
                USER_QUEUE,
                event);

        log.debug("Published AI progress: requestId={}, sessionId={}, agent={}, status={}",
                context.requestId(), context.sessionId(), request.agent(), request.status());
    }

    public void publishSystem(
            AIProgressSessionRegistry.SessionContext context,
            String type,
            String status,
            String message) {
        AIPlanProgressEvent event = AIPlanProgressEvent.of(
                type,
                context.sessionId(),
                context.requestId(),
                "SYSTEM",
                status,
                message,
                null);

        messagingTemplate.convertAndSendToUser(
                context.principalName(),
                USER_QUEUE,
                event);
    }
}
