package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

public class AccountLockedException extends BaseException {
    private static final String ERROR_CODE = "ACCOUNT_LOCKED";

    public AccountLockedException(String message) {
        super(message, ERROR_CODE);
    }
}
