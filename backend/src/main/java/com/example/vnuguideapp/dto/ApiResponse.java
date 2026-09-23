package com.example.vnuguideapp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse <T>(
        Integer code,
        String message,
        T result
) {
}
