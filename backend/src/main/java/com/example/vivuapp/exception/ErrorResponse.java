package com.example.vivuapp.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse<T>(
        Integer status,
        String errorCode,
        String error,
        String message,
        String path
) {

}