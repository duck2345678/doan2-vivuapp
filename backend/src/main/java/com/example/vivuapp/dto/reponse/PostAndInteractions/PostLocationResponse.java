package com.example.vivuapp.dto.reponse.PostAndInteractions;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PostLocationResponse(
        Long id,
        String name,
        String address,
        Double lat,
        Double lng,
        String placeId
) {
}
