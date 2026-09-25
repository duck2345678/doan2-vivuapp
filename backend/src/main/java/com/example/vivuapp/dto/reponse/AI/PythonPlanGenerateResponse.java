package com.example.vivuapp.dto.reponse.AI;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/**
 * Top-level response contract from FastAPI.
 *
 * Detailed Phase 1-4 structures intentionally remain JSON trees here. Python
 * is the source of truth for those internal schemas, avoiding a second Java
 * copy that can drift from the Python contracts.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PythonPlanGenerateResponse(
        Boolean success,
        @JsonProperty("session_id") String sessionId,
        String intent,
        @JsonProperty("parsed_request") JsonNode parsedRequest,
        @JsonProperty("candidate_pool") JsonNode candidatePool,
        @JsonProperty("selected_hotel") JsonNode selectedHotel,
        @JsonProperty("itinerary_days") JsonNode itineraryDays,
        @JsonProperty("clarification_question") String clarificationQuestion,
        @JsonProperty("final_plan") JsonNode finalPlan,
        @JsonProperty("final_response_text") String finalResponseText,
        @JsonProperty("trace_logs") List<AgentTraceLog> traceLogs,
        List<String> warnings,
        List<AgentError> errors,
        @JsonProperty("optimization_exhausted") Boolean optimizationExhausted) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AgentTraceLog(
            @JsonProperty("agent_name") String agentName,
            String stage,
            String status,
            String message,
            @JsonProperty("duration_ms") Integer durationMs,
            String timestamp) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AgentError(
            @JsonProperty("agent_name") String agentName,
            @JsonProperty("error_code") String errorCode,
            String message,
            String timestamp,
            Boolean recoverable) {
    }
}
