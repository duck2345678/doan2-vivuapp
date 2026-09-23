package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

public class PasswordException extends BaseException {

    private static final String ERROR_CODE = "PASSWORD_ERROR";

    public PasswordException(String message) {
        super(message, ERROR_CODE);
    }
}
