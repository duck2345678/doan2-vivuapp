package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

/**
 * Represents failures while communicating with the internal Python AI service.
 */
public class AiServiceException extends BaseException {

    public AiServiceException(String message, String errorCode) {
        super(message, errorCode);
    }

    public AiServiceException(String message, String errorCode, Throwable cause) {
        super(message, errorCode, cause);
    }
}
