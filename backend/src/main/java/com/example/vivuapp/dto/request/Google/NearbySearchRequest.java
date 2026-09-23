package com.example.vivuapp.dto.request.Google;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Request DTO for Google Places API nearby search.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NearbySearchRequest {

    @NonNull
    Double latitude;

    @NonNull
    Double longitude;

    Double radiusMeters;

    List<String> placeTypes;

    Integer maxResults;
}
