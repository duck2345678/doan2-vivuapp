package com.example.vivuapp.authentication;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgetPasswordRequest(
        @NotBlank
        @Email
        String email,
        String newPassword,
        String confirmPassword
) {
}
