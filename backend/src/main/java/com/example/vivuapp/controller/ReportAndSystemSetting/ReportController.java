package com.example.vivuapp.controller.ReportAndSystemSetting;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.ReportAndSystemSetting.ReportResponse;
import com.example.vivuapp.dto.request.ReportAndSystemSetting.CreateReportRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.service.ReportAndSystemSetting.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reports")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Reports", description = "Report management for posts, comments, users, and conversations")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    ReportService reportService;

    @Operation(summary = "Create a report", description = "Submit a report for a post, comment, user, or conversation. Only one target can be specified per report.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReportResponse> createReport(
            @AuthenticationPrincipal User user,
            @RequestBody @Valid CreateReportRequest request) {
        ReportResponse response = reportService.createReport(user, request);
        return ApiResponse.<ReportResponse>builder()
                .code(201)
                .message("Report submitted successfully")
                .result(response)
                .build();
    }
}
