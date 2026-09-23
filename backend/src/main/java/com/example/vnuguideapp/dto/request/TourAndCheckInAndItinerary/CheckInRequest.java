package com.example.vnuguideapp.dto.request.TourAndCheckInAndItinerary;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequest {

    @NotNull(message = "Place ID is required")
    private Long placeId;

    /**
     * Optional: If provided, attach check-in to this tour.
     * If null and user has an ongoing tour, will be attached to that tour.
     */
    private Long tourId;

    private String note;

    /**
     * Optional: If not provided, server will use current time
     */
    private LocalDateTime checkedInAt;
}
