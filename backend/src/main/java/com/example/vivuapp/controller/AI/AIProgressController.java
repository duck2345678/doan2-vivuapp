package com.example.vivuapp.controller.AI;

import com.example.vivuapp.dto.request.AI.PythonAIProgressRequest;
import com.example.vivuapp.service.AI.AIProgressPublisher;
import com.example.vivuapp.ws.AI.AIProgressSessionRegistry;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Internal, key-protected callback endpoint used only by the Python AI service. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/ai")
public class AIProgressController {

    static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final AIProgressSessionRegistry sessionRegistry;
    private final AIProgressPublisher progressPublisher;

    @Value("${ai.python.internal-service-key:}")
    private String internalServiceKey;

    @PostMapping("/progress")
    public ResponseEntity<Void> reportProgress(
            @RequestHeader(value = INTERNAL_KEY_HEADER, required = false) String providedKey,
            @Valid @RequestBody PythonAIProgressRequest request) {

        if (!isAuthorized(providedKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return sessionRegistry.find(request.requestId())
                .map(context -> {
                    if (!context.sessionId().equals(request.sessionId())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).<Void>build();
                    }
                    progressPublisher.publish(context, request);
                    return ResponseEntity.accepted().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.accepted().build());
    }

    private boolean isAuthorized(String providedKey) {
        if (!StringUtils.hasText(internalServiceKey) || !StringUtils.hasText(providedKey)) {
            return false;
        }

        return MessageDigest.isEqual(
                internalServiceKey.trim().getBytes(StandardCharsets.UTF_8),
                providedKey.trim().getBytes(StandardCharsets.UTF_8));
    }
}
