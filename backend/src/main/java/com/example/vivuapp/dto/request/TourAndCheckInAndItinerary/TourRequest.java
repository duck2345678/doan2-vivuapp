package com.example.vivuapp.dto.request.TourAndCheckInAndItinerary;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourRequest {

    @NotBlank(message = "Tour name is required")
    @Size(min = 1, max = 200, message = "Name must be 1-200 characters")
    private String name;

    private String description;

    private LocalDateTime startDate;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    /**
     * Optional list of stops with database Place IDs
     */
    private List<TourStopRequest> stops;

    /**
     * Optional list of stops with Google Place data.
     * Use this when creating stops from Google Maps places.
     * Places will be created or found by googlePlaceId.
     */
    private List<TourStopWithGooglePlaceRequest> googlePlaceStops;
}
