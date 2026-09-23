package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class DuplicateReportException extends BaseException {

    private static final String ERROR_CODE = "DUPLICATE_REPORT";

    public DuplicateReportException() {
        super("You have already reported this content", ERROR_CODE);
    }

    public DuplicateReportException(String targetType) {
        super(String.format("You have already reported this %s", targetType), ERROR_CODE);
    }
}
