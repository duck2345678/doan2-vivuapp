package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class DeleteUserException extends BaseException {
    private static final String ERROR_CODE = "ADMIN_CAN_NOT_DELETE_THEMSELVES";

    public DeleteUserException(String message) {
        super(message, ERROR_CODE);
    }
}
