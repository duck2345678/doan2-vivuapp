package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

public class ReactionAdreadyExistedException extends BaseException {
    private final static String ERROR_CODE = "REACTION_ALREADY_EXISTED";

    public ReactionAdreadyExistedException(String message) {
        super(message, ERROR_CODE);
    }
}
