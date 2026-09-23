package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

public class EmailAlreadyExistedException extends BaseException {

    private static final String ERROR_CODE = "EMAIL_ALREADY_EXISTED";

    public EmailAlreadyExistedException(String email) {
        super(String.format("Email '%s' already in use", email), ERROR_CODE);
    }
}

