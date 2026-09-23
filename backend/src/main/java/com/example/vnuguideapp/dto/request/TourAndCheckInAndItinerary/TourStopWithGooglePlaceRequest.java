package com.example.vnuguideapp.dto.request.TourAndCheckInAndItinerary;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating TourStop with Google Place data.
 * This allows creating stops using Google Place ID instead of database Place ID.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopWithGooglePlaceRequest {

    /**
     * Google Place ID (e.g., "ChIJ...")
     */
    @NotBlank(message = "Google Place ID is required")
    private String googlePlaceId;

    /**
     * Place name from Google
     */
    @NotBlank(message = "Place name is required")
    private String placeName;

    /**
     * Address from Google
     */
    private String address;

    /**
     * Latitude
     */
    private Double latitude;

    /**
     * Longitude
     */
    private Double longitude;

    /**
     * Image URL (thumbnail)
     */
    private String imageUrl;

    /**
     * Optional sequence order. If null, will be added at the end
     */
    private Integer sequenceOrder;

    /**
     * Optional note for this stop
     */
    private String note;
}
