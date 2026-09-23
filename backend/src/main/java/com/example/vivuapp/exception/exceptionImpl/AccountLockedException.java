package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class AccountLockedException extends BaseException {
    private static final String ERROR_CODE = "ACCOUNT_LOCKED";

    public AccountLockedException(String message) {
        super(message, ERROR_CODE);
    }
}
