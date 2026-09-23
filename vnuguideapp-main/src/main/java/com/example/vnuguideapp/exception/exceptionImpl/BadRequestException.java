package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

public class BadRequestException extends BaseException {

    private static final String DEFAULT_MESSAGE = "BAD_REQUEST";

    public BadRequestException(String message) {
        super(message, DEFAULT_MESSAGE);
    }
}

