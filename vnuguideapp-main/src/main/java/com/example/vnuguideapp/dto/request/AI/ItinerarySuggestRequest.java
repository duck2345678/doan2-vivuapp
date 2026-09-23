package com.example.vnuguideapp.dto.request.AI;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Request DTO for AI itinerary suggestion.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ItinerarySuggestRequest {

    /**
     * User's mood for the trip (e.g., "adventurous", "relaxing", "cultural",
     * "foodie")
     */
    String mood;

    /**
     * Starting point latitude
     */
    @NonNull
    Double startLatitude;

    /**
     * Starting point longitude
     */
    @NonNull
    Double startLongitude;

    /**
     * Search radius in kilometers (default: 10)
     */
    Double radiusKm;

    /**
     * Maximum number of stops (default: 5)
     */
    Integer maxStops;

    /**
     * Maximum total duration in hours (default: 8)
     */
    Integer maxDurationHours;

    /**
     * Specific place types to include (overrides mood-based selection)
     */
    List<String> placeTypes;

    /**
     * Time slot preference for the trip (morning, afternoon, evening, fullday)
     */
    String timeSlot;

    /**
     * Group size (solo, couple, small-group, large-group)
     */
    String groupSize;

    /**
     * Budget level (low, high)
     */
    String budget;

    /**
     * Transportation mode (walking-bus, motorbike)
     */
    String transport;
}
