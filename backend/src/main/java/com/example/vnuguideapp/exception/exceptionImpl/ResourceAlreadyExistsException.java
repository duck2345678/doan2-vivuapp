package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

public class ResourceAlreadyExistsException extends BaseException {

    private static final String ERROR_CODE = "RESOURCE_ALREADY_EXISTS";

    public ResourceAlreadyExistsException(String message) {
        super(message, ERROR_CODE);
    }
}
