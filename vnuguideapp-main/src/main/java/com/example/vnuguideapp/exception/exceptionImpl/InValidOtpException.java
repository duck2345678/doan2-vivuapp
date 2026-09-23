package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

public class InValidOtpException extends BaseException {

    private static final String ERROR_CODE = "INVALID_OTP";

    public InValidOtpException(String message) {
        super(message, ERROR_CODE);
    }
}
