package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class BadCredentialsException extends BaseException {
    private static final String ERROR_CODE = "BAD_CREDENTIALS";

    public BadCredentialsException(String message) {
        super(message, ERROR_CODE);
    }
}

