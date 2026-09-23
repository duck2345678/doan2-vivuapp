package com.example.vnuguideapp.controller.PlaceAndMapping;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.PlaceAndMapping.PlaceResponse;
import com.example.vnuguideapp.dto.request.PlaceAndMapping.PlaceRequest;
import com.example.vnuguideapp.dto.request.PlaceAndMapping.PlaceStatusRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.enums.PlaceStatus;
import com.example.vnuguideapp.service.PlaceAndMapping.PlaceService;
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

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PlaceController {

        PlaceService placeService;

        /**
         * GET /api/v1/places - Public: Search/filter places
         */
        @GetMapping("/places")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<Page<PlaceResponse>> searchPlaces(
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Long typeId,
                        @RequestParam(required = false) Long provinceId,
                        @RequestParam(required = false) Long districtId,
                        @RequestParam(required = false) Long wardId,
                        @RequestParam(required = false) PlaceStatus status,
                        @RequestParam(required = false) Double lat,
                        @RequestParam(required = false) Double lng,
                        @RequestParam(required = false) Double radius,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {
                // If geo params provided, use geo search
                if (lat != null && lng != null && radius != null) {
                        List<PlaceResponse> geoPlaces = placeService.searchPlacesWithinRadius(
                                        keyword, typeId, status, lat, lng, radius);
                        // For geo search, return empty page with embedded list in message
                        return ApiResponse.<Page<PlaceResponse>>builder()
                                        .code(200)
                                        .message("Found " + geoPlaces.size() + " places within " + radius + "km radius")
                                        .result(null)
                                        .build();
                }

                Pageable pageable = PageRequest.of(page, size);
                Page<PlaceResponse> places = placeService.searchPlaces(
                                keyword, typeId, provinceId, districtId, wardId, status, pageable);
                return ApiResponse.<Page<PlaceResponse>>builder()
                                .code(200)
                                .message("Places retrieved successfully")
                                .result(places)
                                .build();
        }

        /**
         * GET /api/v1/places/nearby - Public: Search places within radius
         */
        @GetMapping("/places/nearby")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<List<PlaceResponse>> searchNearbyPlaces(
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Long typeId,
                        @RequestParam(required = false) PlaceStatus status,
                        @RequestParam Double lat,
                        @RequestParam Double lng,
                        @RequestParam(defaultValue = "5") Double radius) {
                List<PlaceResponse> places = placeService.searchPlacesWithinRadius(
                                keyword, typeId, status, lat, lng, radius);
                return ApiResponse.<List<PlaceResponse>>builder()
                                .code(200)
                                .message("Nearby places retrieved successfully")
                                .result(places)
                                .build();
        }

        /**
         * GET /api/v1/places/{id} - Public: Get place details
         */
        @GetMapping("/places/{id}")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<PlaceResponse> getPlaceById(@PathVariable Long id) {
                PlaceResponse place = placeService.getPlaceById(id);
                return ApiResponse.<PlaceResponse>builder()
                                .code(200)
                                .message("Place retrieved successfully")
                                .result(place)
                                .build();
        }

        /**
         * POST /api/v1/admin/places - Admin: Create new place
         */
        @PostMapping("/admin/places")
        @ResponseStatus(HttpStatus.CREATED)
        @PreAuthorize("hasRole('ADMIN')")
        public ApiResponse<PlaceResponse> createPlace(
                        @AuthenticationPrincipal User user,
                        @RequestBody @Valid PlaceRequest request) {
                PlaceResponse place = placeService.createPlace(request, user);
                return ApiResponse.<PlaceResponse>builder()
                                .code(201)
                                .message("Place created successfully")
                                .result(place)
                                .build();
        }

        /**
         * PATCH /api/v1/admin/places/{id} - Admin: Update place
         */
        @PatchMapping("/admin/places/{id}")
        @ResponseStatus(HttpStatus.OK)
        @PreAuthorize("hasRole('ADMIN')")
        public ApiResponse<PlaceResponse> updatePlace(
                        @PathVariable Long id,
                        @RequestBody @Valid PlaceRequest request) {
                PlaceResponse place = placeService.updatePlace(id, request);
                return ApiResponse.<PlaceResponse>builder()
                                .code(200)
                                .message("Place updated successfully")
                                .result(place)
                                .build();
        }

        /**
         * PATCH /api/v1/admin/places/{id}/status - Admin: Update place status
         */
        @PatchMapping("/admin/places/{id}/status")
        @ResponseStatus(HttpStatus.OK)
        @PreAuthorize("hasRole('ADMIN')")
        public ApiResponse<PlaceResponse> updatePlaceStatus(
                        @PathVariable Long id,
                        @RequestBody @Valid PlaceStatusRequest request) {
                PlaceResponse place = placeService.updatePlaceStatus(id, request);
                return ApiResponse.<PlaceResponse>builder()
                                .code(200)
                                .message("Place status updated successfully")
                                .result(place)
                                .build();
        }
}
