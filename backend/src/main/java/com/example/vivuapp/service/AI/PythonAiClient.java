package com.example.vivuapp.service.AI;

import com.example.vivuapp.dto.request.AI.PythonPlanGenerateRequest;
import com.example.vivuapp.dto.reponse.AI.PythonPlanGenerateResponse;
import com.example.vivuapp.exception.exceptionImpl.AiServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Low-level synchronous HTTP client for the internal FastAPI service.
 * No planning/business logic belongs here.
 */
@Component
@Slf4j
public class PythonAiClient {

    private static final String INTERNAL_SERVICE_KEY_HEADER = "X-Internal-Service-Key";
    private static final String REQUEST_ID_HEADER = "X-Request-ID";

    private final RestClient restClient;
    private final String planUrl;
    private final String internalServiceKey;

    public PythonAiClient(
            @Qualifier("pythonAiRestClient") RestClient restClient,
            @Value("${ai.python.plan-url:http://localhost:8000/api/v1/plan/generate}") String planUrl,
            @Value("${ai.python.internal-service-key:}") String internalServiceKey) {
        this.restClient = restClient;
        this.planUrl = planUrl;
        this.internalServiceKey = internalServiceKey == null ? "" : internalServiceKey.trim();
    }

    public PythonPlanGenerateResponse generatePlan(PythonPlanGenerateRequest request) {
        try {
            PythonPlanGenerateResponse response = restClient.post()
                    .uri(planUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> {
                        headers.set(REQUEST_ID_HEADER, request.requestId() != null ? request.requestId() : request.sessionId());
                        if (!internalServiceKey.isBlank()) {
                            headers.set(INTERNAL_SERVICE_KEY_HEADER, internalServiceKey);
                        }
                    })
                    .body(request)
                    .retrieve()
                    .onStatus(
                            status -> status.isError(),
                            (clientRequest, clientResponse) -> {
                                throw new AiServiceException(
                                        "Python AI service returned HTTP " + clientResponse.getStatusCode().value(),
                                        "AI_PYTHON_UPSTREAM_ERROR");
                            })
                    .body(PythonPlanGenerateResponse.class);

            if (response == null) {
                throw new AiServiceException(
                        "Python AI service returned an empty response.",
                        "AI_PYTHON_INVALID_RESPONSE");
            }

            if (response.sessionId() == null || response.sessionId().isBlank()) {
                throw new AiServiceException(
                        "Python AI service response is missing session_id.",
                        "AI_PYTHON_INVALID_RESPONSE");
            }

            if (!request.sessionId().equals(response.sessionId())) {
                throw new AiServiceException(
                        "Python AI service returned a different session_id.",
                        "AI_PYTHON_SESSION_MISMATCH");
            }

            return response;
        } catch (AiServiceException ex) {
            throw ex;
        } catch (RestClientException ex) {
            log.error("Python AI service call failed for session {}: {}", request.sessionId(), ex.getMessage(), ex);
            throw new AiServiceException(
                    "Không thể kết nối tới Python AI service.",
                    "AI_PYTHON_SERVICE_UNAVAILABLE",
                    ex);
        } catch (Exception ex) {
            log.error("Unexpected Python AI bridge failure for session {}", request.sessionId(), ex);
            throw new AiServiceException(
                    "Không thể xử lý phản hồi từ Python AI service.",
                    "AI_PYTHON_INVALID_RESPONSE",
                    ex);
        }
    }
}
