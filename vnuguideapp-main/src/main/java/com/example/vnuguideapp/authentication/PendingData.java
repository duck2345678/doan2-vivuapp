package com.example.vnuguideapp.authentication;

public record PendingData <T>(
        String otp,
        T request
) {
}
