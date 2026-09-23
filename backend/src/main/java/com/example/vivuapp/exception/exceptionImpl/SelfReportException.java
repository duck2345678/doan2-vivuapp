package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class SelfReportException extends BaseException {

    private static final String ERROR_CODE = "SELF_REPORT_NOT_ALLOWED";

    public SelfReportException() {
        super("You cannot report yourself", ERROR_CODE);
    }
}
