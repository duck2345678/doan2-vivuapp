package com.example.vnuguideapp.controller.PlaceAndMapping;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.PlaceAndMapping.PersonalPinResponse;
import com.example.vnuguideapp.dto.request.PlaceAndMapping.PersonalPinRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.service.PlaceAndMapping.PersonalPinService;
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

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/me/personal-pins")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PersonalPinController {

    PersonalPinService personalPinService;

    /**
     * GET /api/v1/me/personal-pins - Authenticated: Get user's personal pins
     */
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<Page<PersonalPinResponse>> getMyPins(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PersonalPinResponse> pins = personalPinService.getMyPins(user, pageable);
        return ApiResponse.<Page<PersonalPinResponse>>builder()
                .code(200)
                .message("Personal pins retrieved successfully")
                .result(pins)
                .build();
    }

    /**
     * POST /api/v1/me/personal-pins - Authenticated: Create personal pin
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PersonalPinResponse> createPin(
            @AuthenticationPrincipal User user,
            @RequestBody @Valid PersonalPinRequest request) {
        PersonalPinResponse pin = personalPinService.createPin(user, request);
        return ApiResponse.<PersonalPinResponse>builder()
                .code(201)
                .message("Personal pin created successfully")
                .result(pin)
                .build();
    }

    /**
     * PATCH /api/v1/me/personal-pins/{id} - Authenticated: Update personal pin
     */
    @PatchMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<PersonalPinResponse> updatePin(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody @Valid PersonalPinRequest request) {
        PersonalPinResponse pin = personalPinService.updatePin(user, id, request);
        return ApiResponse.<PersonalPinResponse>builder()
                .code(200)
                .message("Personal pin updated successfully")
                .result(pin)
                .build();
    }

    /**
     * DELETE /api/v1/me/personal-pins/{id} - Authenticated: Delete personal pin
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ApiResponse<String> deletePin(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        personalPinService.deletePin(user, id);
        return ApiResponse.<String>builder()
                .code(200)
                .message("Personal pin deleted successfully")
                .result("Deleted")
                .build();
    }
}
