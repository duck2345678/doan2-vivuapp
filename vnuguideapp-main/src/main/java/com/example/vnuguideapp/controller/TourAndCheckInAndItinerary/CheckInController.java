package com.example.vnuguideapp.controller.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.TourAndCheckInAndItinerary.CheckInResponse;
import com.example.vnuguideapp.dto.request.TourAndCheckInAndItinerary.CheckInRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.service.TourAndCheckInAndItinerary.CheckInService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CheckInController {

    CheckInService checkInService;

    /**
     * POST /api/v1/check-ins - Authenticated: Check-in at a place
     */
    @PostMapping("/check-ins")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CheckInResponse> checkIn(
            @AuthenticationPrincipal User user,
            @RequestBody @Valid CheckInRequest request) {
        CheckInResponse checkIn = checkInService.checkIn(user, request);
        return ApiResponse.<CheckInResponse>builder()
                .code(201)
                .message("Check-in successful")
                .result(checkIn)
                .build();
    }

    /**
     * GET /api/v1/me/check-ins - Authenticated: Get user's check-in history
     */
    @GetMapping("/me/check-ins")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<Page<CheckInResponse>> getMyCheckIns(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long placeId,
            @RequestParam(required = false) Long tourId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CheckInResponse> checkIns = checkInService.getMyCheckIns(user, placeId, tourId, from, to, pageable);
        return ApiResponse.<Page<CheckInResponse>>builder()
                .code(200)
                .message("Check-ins retrieved successfully")
                .result(checkIns)
                .build();
    }
}
