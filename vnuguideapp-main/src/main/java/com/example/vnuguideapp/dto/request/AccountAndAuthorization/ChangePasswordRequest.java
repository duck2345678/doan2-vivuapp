package com.example.vnuguideapp.dto.request.AccountAndAuthorization;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
        @NotBlank
        String oldPassword,
        @NotBlank
        String newPassword,
        @NotBlank
        String confirmPassword
) {
}
