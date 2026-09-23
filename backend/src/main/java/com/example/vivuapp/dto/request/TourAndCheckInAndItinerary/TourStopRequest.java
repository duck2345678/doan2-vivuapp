package com.example.vivuapp.dto.request.TourAndCheckInAndItinerary;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopRequest {

    @NotNull(message = "Place ID is required")
    private Long placeId;

    private String note;

    /**
     * Optional. If null, the stop will be added at the end
     */
    private Integer sequenceOrder;
}
