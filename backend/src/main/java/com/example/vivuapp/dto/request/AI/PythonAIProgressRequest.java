package com.example.vivuapp.dto.request.AI;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

/** Internal callback payload posted by Python AI to Spring Boot. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PythonAIProgressRequest(
        @NotBlank @JsonProperty("type") String type,
        @NotBlank @JsonProperty("session_id") String sessionId,
        @NotBlank @JsonProperty("request_id") String requestId,
        @NotBlank @JsonProperty("agent") String agent,
        @NotBlank @JsonProperty("status") String status,
        @NotBlank @JsonProperty("message") String message,
        @JsonProperty("loop_count") Integer loopCount) {
}
