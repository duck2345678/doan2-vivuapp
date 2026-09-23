package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class BadRequestException extends BaseException {

    private static final String DEFAULT_MESSAGE = "BAD_REQUEST";

    public BadRequestException(String message) {
        super(message, DEFAULT_MESSAGE);
    }
}

