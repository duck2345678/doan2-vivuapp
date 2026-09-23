package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class ResourceAlreadyExistsException extends BaseException {

    private static final String ERROR_CODE = "RESOURCE_ALREADY_EXISTS";

    public ResourceAlreadyExistsException(String message) {
        super(message, ERROR_CODE);
    }
}
