package com.example.vivuapp.dto.request.PostAndInteractions;

public record PostLocationRequest(
        String name,
        String address,
        Double lat,
        Double lng,
        String placeId
) {
}
