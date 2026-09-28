package com.example.vivuapp.exception;

public class GeocodingProviderException extends RuntimeException {
    public GeocodingProviderException(String message) {
        super(message);
    }

    public GeocodingProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
