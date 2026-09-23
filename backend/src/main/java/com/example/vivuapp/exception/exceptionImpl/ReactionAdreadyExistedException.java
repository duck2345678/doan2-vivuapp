package com.example.vivuapp.exception.exceptionImpl;

import com.example.vivuapp.exception.BaseException;

public class ReactionAdreadyExistedException extends BaseException {
    private final static String ERROR_CODE = "REACTION_ALREADY_EXISTED";

    public ReactionAdreadyExistedException(String message) {
        super(message, ERROR_CODE);
    }
}
