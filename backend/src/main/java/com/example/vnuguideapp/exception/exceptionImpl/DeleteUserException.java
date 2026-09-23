package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

public class DeleteUserException extends BaseException {
    private static final String ERROR_CODE = "ADMIN_CAN_NOT_DELETE_THEMSELVES";

    public DeleteUserException(String message) {
        super(message, ERROR_CODE);
    }
}
