package com.example.vivuapp.dto.reponse.Google;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Response DTO for Google Routes API computed route.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RouteResult {

    Integer distanceMeters;
    Integer durationSeconds;
    String encodedPolyline;

    /**
     * Get distance in kilometers.
     */
    public Double getDistanceKm() {
        return distanceMeters != null ? distanceMeters / 1000.0 : null;
    }

    /**
     * Get duration in minutes.
     */
    public Integer getDurationMinutes() {
        return durationSeconds != null ? durationSeconds / 60 : null;
    }
}
