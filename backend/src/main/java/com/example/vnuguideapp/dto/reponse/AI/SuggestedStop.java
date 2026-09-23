package com.example.vnuguideapp.dto.reponse.AI;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Response DTO for a single stop in an AI-suggested itinerary.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SuggestedStop {

    Integer sequenceOrder;
    String googlePlaceId;
    String placeName;
    String address;
    Double latitude;
    Double longitude;
    Double rating;
    Integer suggestedDurationMinutes;
    String aiReason;
}
