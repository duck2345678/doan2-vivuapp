package com.example.vnuguideapp.dto.reponse.AI;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Response DTO for AI-generated itinerary suggestion.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SuggestedItinerary {

    String name;
    String mood;
    List<SuggestedStop> stops;
    Double totalDistanceKm;
    Integer totalDurationMinutes;
    String routePolyline;
    String mapPreviewUrl;
}
