package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class InValidOtpException extends BaseException {

    private static final String ERROR_CODE = "INVALID_OTP";

    public InValidOtpException(String message) {
        super(message, ERROR_CODE);
    }
}
