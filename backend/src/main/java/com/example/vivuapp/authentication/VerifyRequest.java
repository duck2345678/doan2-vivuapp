package com.example.vivuapp.authentication;

import jakarta.validation.constraints.Email;

public record VerifyRequest(
        @Email
        String email,
        String otp
) {
}
