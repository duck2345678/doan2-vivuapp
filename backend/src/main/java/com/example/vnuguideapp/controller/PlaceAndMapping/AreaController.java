package com.example.vnuguideapp.controller.PlaceAndMapping;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.PlaceAndMapping.AreaResponse;
import com.example.vnuguideapp.dto.request.PlaceAndMapping.AreaRequest;
import com.example.vnuguideapp.service.PlaceAndMapping.AreaService;
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
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AreaController {

    AreaService areaService;

    /**
     * GET /api/v1/areas - Public endpoint to list all areas
     */
    @GetMapping("/areas")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<AreaResponse>> getAllAreas() {
        List<AreaResponse> areas = areaService.getAllAreas();
        return ApiResponse.<List<AreaResponse>>builder()
                .code(200)
                .message("Areas retrieved successfully")
                .result(areas)
                .build();
    }

    /**
     * POST /api/v1/admin/areas - Admin only: Create new area
     */
    @PostMapping("/admin/areas")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AreaResponse> createArea(@RequestBody @Valid AreaRequest request) {
        AreaResponse area = areaService.createArea(request);
        return ApiResponse.<AreaResponse>builder()
                .code(201)
                .message("Area created successfully")
                .result(area)
                .build();
    }

    /**
     * PATCH /api/v1/admin/areas/{id} - Admin only: Update area
     */
    @PatchMapping("/admin/areas/{id}")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AreaResponse> updateArea(
            @PathVariable Long id,
            @RequestBody @Valid AreaRequest request) {
        AreaResponse area = areaService.updateArea(id, request);
        return ApiResponse.<AreaResponse>builder()
                .code(200)
                .message("Area updated successfully")
                .result(area)
                .build();
    }
}
