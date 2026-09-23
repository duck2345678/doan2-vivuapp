package com.example.vnuguideapp.controller.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.TourAndCheckInAndItinerary.TourStopResponse;
import com.example.vnuguideapp.dto.request.TourAndCheckInAndItinerary.TourStopRequest;
import com.example.vnuguideapp.dto.request.TourAndCheckInAndItinerary.TourStopReorderRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.service.TourAndCheckInAndItinerary.TourStopService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TourStopController {

    TourStopService tourStopService;

    /**
     * GET /api/v1/tours/{id}/stops - Authenticated: Get tour stops
     */
    @GetMapping("/tours/{id}/stops")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<TourStopResponse>> getStops(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        List<TourStopResponse> stops = tourStopService.getStops(user, id);
        return ApiResponse.<List<TourStopResponse>>builder()
                .code(200)
                .message("Tour stops retrieved successfully")
                .result(stops)
                .build();
    }

    /**
     * POST /api/v1/me/tours/{id}/stops - Authenticated: Add stop to tour
     */
    @PostMapping("/me/tours/{id}/stops")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TourStopResponse> addStop(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody @Valid TourStopRequest request) {
        TourStopResponse stop = tourStopService.addStop(user, id, request);
        return ApiResponse.<TourStopResponse>builder()
                .code(201)
                .message("Tour stop added successfully")
                .result(stop)
                .build();
    }

    /**
     * PUT /api/v1/me/tours/{id}/stops/reorder - Authenticated: Reorder stops
     */
    @PutMapping("/me/tours/{id}/stops/reorder")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<TourStopResponse>> reorderStops(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody @Valid TourStopReorderRequest request) {
        List<TourStopResponse> stops = tourStopService.reorderStops(user, id, request);
        return ApiResponse.<List<TourStopResponse>>builder()
                .code(200)
                .message("Tour stops reordered successfully")
                .result(stops)
                .build();
    }

    /**
     * DELETE /api/v1/me/tours/{id}/stops/{stopId} - Authenticated: Remove stop
     */
    @DeleteMapping("/me/tours/{id}/stops/{stopId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ApiResponse<String> removeStop(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @PathVariable Long stopId) {
        tourStopService.removeStop(user, id, stopId);
        return ApiResponse.<String>builder()
                .code(200)
                .message("Tour stop removed successfully")
                .result("Removed")
                .build();
    }
}
