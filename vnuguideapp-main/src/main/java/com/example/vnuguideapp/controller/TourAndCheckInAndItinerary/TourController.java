package com.example.vnuguideapp.controller.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.TourAndCheckInAndItinerary.TourResponse;
import com.example.vnuguideapp.dto.request.TourAndCheckInAndItinerary.TourRequest;
import com.example.vnuguideapp.dto.request.TourAndCheckInAndItinerary.TourShareRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.enums.TourStatus;
import com.example.vnuguideapp.service.TourAndCheckInAndItinerary.TourService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TourController {

    TourService tourService;

    /**
     * GET /api/v1/me/tours - Authenticated: Get user's tours
     */
    @GetMapping("/me/tours")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<Page<TourResponse>> getMyTours(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) TourStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<TourResponse> tours = tourService.getMyTours(user, status, pageable);
        return ApiResponse.<Page<TourResponse>>builder()
                .code(200)
                .message("Tours retrieved successfully")
                .result(tours)
                .build();
    }

    /**
     * GET /api/v1/me/tours/current - Authenticated: Get current ongoing tour
     */
    @GetMapping("/me/tours/current")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<TourResponse> getCurrentTour(@AuthenticationPrincipal User user) {
        Optional<TourResponse> tour = tourService.getCurrentTour(user);
        return ApiResponse.<TourResponse>builder()
                .code(200)
                .message(tour.isPresent() ? "Current tour retrieved" : "No ongoing tour")
                .result(tour.orElse(null))
                .build();
    }

    /**
     * POST /api/v1/me/tours - Authenticated: Create new tour
     */
    @PostMapping("/me/tours")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TourResponse> createTour(
            @AuthenticationPrincipal User user,
            @RequestBody @Valid TourRequest request) {
        TourResponse tour = tourService.createTour(user, request);
        return ApiResponse.<TourResponse>builder()
                .code(201)
                .message("Tour created successfully")
                .result(tour)
                .build();
    }

    /**
     * GET /api/v1/tours/{id} - Authenticated: Get tour details
     */
    @GetMapping("/tours/{id}")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<TourResponse> getTourById(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        TourResponse tour = tourService.getTourById(user, id);
        return ApiResponse.<TourResponse>builder()
                .code(200)
                .message("Tour retrieved successfully")
                .result(tour)
                .build();
    }

    /**
     * PATCH /api/v1/me/tours/{id} - Authenticated: Update tour
     */
    @PatchMapping("/me/tours/{id}")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<TourResponse> updateTour(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody @Valid TourRequest request) {
        TourResponse tour = tourService.updateTour(user, id, request);
        return ApiResponse.<TourResponse>builder()
                .code(200)
                .message("Tour updated successfully")
                .result(tour)
                .build();
    }

    /**
     * POST /api/v1/me/tours/{id}/complete - Authenticated: Complete tour
     */
    @PostMapping("/me/tours/{id}/complete")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<TourResponse> completeTour(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        TourResponse tour = tourService.completeTour(user, id);
        return ApiResponse.<TourResponse>builder()
                .code(200)
                .message("Tour completed successfully")
                .result(tour)
                .build();
    }

    /**
     * POST /api/v1/me/tours/{id}/start - Authenticated: Start tour (change status to ONGOING)
     */
    @PostMapping("/me/tours/{id}/start")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<TourResponse> startTour(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        TourResponse tour = tourService.startTour(user, id);
        return ApiResponse.<TourResponse>builder()
                .code(200)
                .message("Tour started successfully")
                .result(tour)
                .build();
    }

    /**
     * POST /api/v1/me/tours/{id}/cancel - Authenticated: Cancel tour
     */
    @PostMapping("/me/tours/{id}/cancel")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<TourResponse> cancelTour(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        TourResponse tour = tourService.cancelTour(user, id);
        return ApiResponse.<TourResponse>builder()
                .code(200)
                .message("Tour cancelled successfully")
                .result(tour)
                .build();
    }

    /**
     * POST /api/v1/me/tours/{id}/share-as-post - Authenticated: Share tour as post
     */
    @PostMapping("/me/tours/{id}/share-as-post")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<TourResponse> shareAsPost(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody @Valid TourShareRequest request) {
        TourResponse tour = tourService.shareAsPost(user, id, request);
        return ApiResponse.<TourResponse>builder()
                .code(200)
                .message("Tour shared as post successfully")
                .result(tour)
                .build();
    }

    /**
     * POST /api/v1/tours/{id}/copy - Authenticated: Copy a shared tour
     */
    @PostMapping("/tours/{id}/copy")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TourResponse> copyTour(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        TourResponse tour = tourService.copyTour(user, id);
        return ApiResponse.<TourResponse>builder()
                .code(201)
                .message("Tour copied successfully")
                .result(tour)
                .build();
    }
}
