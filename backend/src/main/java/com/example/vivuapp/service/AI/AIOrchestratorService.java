package com.example.vivuapp.service.AI;

import com.example.vivuapp.dto.request.AI.PlanGenerateRequest;
import com.example.vivuapp.dto.request.AI.PythonPlanGenerateRequest;
import com.example.vivuapp.dto.reponse.AI.PythonPlanGenerateResponse;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.exception.exceptionImpl.AiServiceException;
import com.example.vivuapp.ws.AI.AIProgressSessionRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Application service for the public Spring -> Python AI bridge.
 *
 * Spring owns authentication and realtime user routing. Python owns planning,
 * deterministic validation and optimization.
 */
@Service
@RequiredArgsConstructor
public class AIOrchestratorService {

    private final PythonAiClient pythonAiClient;
    private final AIProgressSessionRegistry progressSessionRegistry;
    private final AIProgressPublisher progressPublisher;

    public PythonPlanGenerateResponse generatePlan(User user, PlanGenerateRequest request) {
        String principalName = user != null ? user.getUsername() : null;
        String requestId = UUID.randomUUID().toString();

        if (principalName == null || principalName.isBlank()) {
            throw new AiServiceException(
                    "Không thể xác định người dùng cho AI request.",
                    "AI_USER_CONTEXT_UNAVAILABLE");
        }

        progressSessionRegistry.register(requestId, request.getSessionId(), principalName);
        var context = progressSessionRegistry.find(requestId).orElseThrow();
        progressPublisher.publishSystem(context, "PLAN_STARTED", "STARTED", "Đang bắt đầu lập kế hoạch chuyến đi...");

        try {
            PythonPlanGenerateRequest internalRequest = new PythonPlanGenerateRequest(
                    request.getSessionId(),
                    user.getId() != null ? user.getId().toString() : null,
                    request.getRawPrompt(),
                    request.safeUserPreferences(),
                    requestId);

            PythonPlanGenerateResponse response = pythonAiClient.generatePlan(internalRequest);

            if (response.success() != null && response.success()) {
                progressPublisher.publishSystem(
                        context,
                        "PLAN_COMPLETED",
                        "COMPLETED",
                        "Đã hoàn tất kế hoạch chuyến đi.");
            } else if (response.clarificationQuestion() != null && !response.clarificationQuestion().isBlank()) {
                progressPublisher.publishSystem(
                        context,
                        "PLAN_CLARIFICATION_REQUIRED",
                        "CLARIFICATION_REQUIRED",
                        "Cần thêm thông tin để hoàn thiện kế hoạch.");
            } else {
                progressPublisher.publishSystem(
                        context,
                        "PLAN_FAILED",
                        "FAILED",
                        "Không thể hoàn thiện kế hoạch chuyến đi.");
            }

            return response;
        } catch (AiServiceException ex) {
            progressPublisher.publishSystem(
                    context,
                    "PLAN_FAILED",
                    "FAILED",
                    "Không thể kết nối hoặc xử lý AI service.");
            throw ex;
        } catch (RuntimeException ex) {
            progressPublisher.publishSystem(
                    context,
                    "PLAN_FAILED",
                    "FAILED",
                    "Không thể hoàn thiện kế hoạch chuyến đi.");
            throw ex;
        } finally {
            progressSessionRegistry.remove(requestId);
        }
    }
}
