package com.example.vivuapp.authentication;

public record PendingData <T>(
        String otp,
        T request
) {
}
