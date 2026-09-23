package com.example.vivuapp.controller.PlaceAndMapping;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.PlaceAndMapping.PlaceTypeResponse;
import com.example.vivuapp.dto.request.PlaceAndMapping.PlaceTypeRequest;
import com.example.vivuapp.service.PlaceAndMapping.PlaceTypeService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PlaceTypeController {

    PlaceTypeService placeTypeService;

    /**
     * GET /api/v1/place-types - Public endpoint to list all place types
     */
    @GetMapping("/place-types")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<PlaceTypeResponse>> getAllPlaceTypes() {
        List<PlaceTypeResponse> types = placeTypeService.getAllPlaceTypes();
        return ApiResponse.<List<PlaceTypeResponse>>builder()
                .code(200)
                .message("Place types retrieved successfully")
                .result(types)
                .build();
    }

    /**
     * POST /api/v1/admin/place-types - Admin only: Create new place type
     */
    @PostMapping("/admin/place-types")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PlaceTypeResponse> createPlaceType(@RequestBody @Valid PlaceTypeRequest request) {
        PlaceTypeResponse type = placeTypeService.createPlaceType(request);
        return ApiResponse.<PlaceTypeResponse>builder()
                .code(201)
                .message("Place type created successfully")
                .result(type)
                .build();
    }

    /**
     * PATCH /api/v1/admin/place-types/{id} - Admin only: Update place type
     */
    @PatchMapping("/admin/place-types/{id}")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PlaceTypeResponse> updatePlaceType(
            @PathVariable Long id,
            @RequestBody @Valid PlaceTypeRequest request) {
        PlaceTypeResponse type = placeTypeService.updatePlaceType(id, request);
        return ApiResponse.<PlaceTypeResponse>builder()
                .code(200)
                .message("Place type updated successfully")
                .result(type)
                .build();
    }
}
