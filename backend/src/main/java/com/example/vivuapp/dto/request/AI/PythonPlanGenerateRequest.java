package com.example.vivuapp.dto.request.AI;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

/**
 * Internal contract sent to the FastAPI AI service.
 * Field names intentionally mirror the Python API contract.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PythonPlanGenerateRequest(
        @JsonProperty("session_id") String sessionId,
        @JsonProperty("user_id") String userId,
        @JsonProperty("raw_prompt") String rawPrompt,
        @JsonProperty("user_preferences") Map<String, Object> userPreferences,
        @JsonProperty("request_id") String requestId) {

    public PythonPlanGenerateRequest(
            String sessionId,
            String userId,
            String rawPrompt,
            Map<String, Object> userPreferences) {
        this(sessionId, userId, rawPrompt, userPreferences, null);
    }
}
