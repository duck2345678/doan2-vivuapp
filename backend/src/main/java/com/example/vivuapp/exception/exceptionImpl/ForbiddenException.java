package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class ForbiddenException extends BaseException {

    private static final String ERROR_CODE = "FORBIDDEN";

    public ForbiddenException(String message) {
        super(message, ERROR_CODE);
    }
}
