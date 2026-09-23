package com.example.vnuguideapp.dto.reponse.Google;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Response DTO for Google Places API search results.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlaceSearchResult {

    String googlePlaceId;
    String name;
    String formattedAddress;
    Double latitude;
    Double longitude;
    Double rating;
    Integer userRatingCount;
}
