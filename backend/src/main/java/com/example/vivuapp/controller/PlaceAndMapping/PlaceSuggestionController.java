package com.example.vivuapp.controller.PlaceAndMapping;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.PlaceAndMapping.PlaceSuggestionResponse;
import com.example.vivuapp.dto.request.PlaceAndMapping.PlaceSuggestionRequest;
import com.example.vivuapp.dto.request.PlaceAndMapping.PlaceSuggestionReviewRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.enums.PlaceSuggestionStatus;
import com.example.vivuapp.service.PlaceAndMapping.PlaceSuggestionService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PlaceSuggestionController {

    PlaceSuggestionService placeSuggestionService;

    /**
     * POST /api/v1/place-suggestions - Authenticated: Submit a place suggestion
     */
    @PostMapping("/place-suggestions")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlaceSuggestionResponse> submitSuggestion(
            @AuthenticationPrincipal User user,
            @RequestBody @Valid PlaceSuggestionRequest request) {
        PlaceSuggestionResponse response = placeSuggestionService.submitSuggestion(user, request);
        return ApiResponse.<PlaceSuggestionResponse>builder()
                .code(201)
                .message("Place suggestion submitted successfully")
                .result(response)
                .build();
    }

    /**
     * GET /api/v1/me/place-suggestions - Authenticated: Get user's suggestions
     */
    @GetMapping("/me/place-suggestions")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<Page<PlaceSuggestionResponse>> getMySuggestions(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) PlaceSuggestionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PlaceSuggestionResponse> suggestions = placeSuggestionService.getMySuggestions(user, status, pageable);
        return ApiResponse.<Page<PlaceSuggestionResponse>>builder()
                .code(200)
                .message("Place suggestions retrieved successfully")
                .result(suggestions)
                .build();
    }

    /**
     * GET /api/v1/admin/place-suggestions - Admin: Get all suggestions with status
     * filter
     */
    @GetMapping("/admin/place-suggestions")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Page<PlaceSuggestionResponse>> getAllSuggestions(
            @RequestParam(required = false) PlaceSuggestionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PlaceSuggestionResponse> suggestions = placeSuggestionService.getAllSuggestions(status, pageable);
        return ApiResponse.<Page<PlaceSuggestionResponse>>builder()
                .code(200)
                .message("Place suggestions retrieved successfully")
                .result(suggestions)
                .build();
    }

    /**
     * PATCH /api/v1/admin/place-suggestions/{id}/review - Admin: Review suggestion
     */
    @PatchMapping("/admin/place-suggestions/{id}/review")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PlaceSuggestionResponse> reviewSuggestion(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody @Valid PlaceSuggestionReviewRequest request) {
        PlaceSuggestionResponse response = placeSuggestionService.reviewSuggestion(user, id, request);
        return ApiResponse.<PlaceSuggestionResponse>builder()
                .code(200)
                .message("Place suggestion reviewed successfully")
                .result(response)
                .build();
    }
}
