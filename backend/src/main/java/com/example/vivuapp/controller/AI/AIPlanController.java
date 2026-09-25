package com.example.vivuapp.controller.AI;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.AI.PythonPlanGenerateResponse;
import com.example.vivuapp.dto.request.AI.PlanGenerateRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.service.AI.AIOrchestratorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public mobile-facing endpoint for the new ViVu multi-agent planning flow.
 */
@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/api/ai")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "AI Planning", description = "ViVu Multi-Agent AI planning bridge")
public class AIPlanController {

    AIOrchestratorService aiOrchestratorService;

    @PostMapping("/plan")
    @Operation(
            summary = "Generate AI travel plan",
            description = "Forwards an authenticated planning request to the internal Python FastAPI + LangGraph service.")
    public ResponseEntity<ApiResponse<PythonPlanGenerateResponse>> generatePlan(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PlanGenerateRequest request) {

        PythonPlanGenerateResponse response = aiOrchestratorService.generatePlan(user, request);

        return ResponseEntity.status(HttpStatus.OK).body(
                ApiResponse.<PythonPlanGenerateResponse>builder()
                        .code(HttpStatus.OK.value())
                        .message(response.finalResponseText() != null
                                ? response.finalResponseText()
                                : "AI plan processed successfully")
                        .result(response)
                        .build());
    }
}
