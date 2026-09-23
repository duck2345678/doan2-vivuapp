package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class EmailAlreadyExistedException extends BaseException {

    private static final String ERROR_CODE = "EMAIL_ALREADY_EXISTED";

    public EmailAlreadyExistedException(String email) {
        super(String.format("Email '%s' already in use", email), ERROR_CODE);
    }
}

