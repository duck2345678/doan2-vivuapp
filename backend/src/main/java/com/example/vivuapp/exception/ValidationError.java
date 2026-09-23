package com.example.vivuapp.exception;

/**
 * A record to hold details about a single validation error.
 * @param field The name of the field that failed validation.
 * @param message The error message for the validation failure.
 */
public record ValidationError(String field, String message) {
}

