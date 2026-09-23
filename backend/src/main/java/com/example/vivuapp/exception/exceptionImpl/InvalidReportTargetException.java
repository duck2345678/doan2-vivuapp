package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class InvalidReportTargetException extends BaseException {

    private static final String ERROR_CODE = "INVALID_REPORT_TARGET";

    public InvalidReportTargetException() {
        super("Exactly one target (post, comment, user, or conversation) must be specified", ERROR_CODE);
    }

    public InvalidReportTargetException(String message) {
        super(message, ERROR_CODE);
    }
}
