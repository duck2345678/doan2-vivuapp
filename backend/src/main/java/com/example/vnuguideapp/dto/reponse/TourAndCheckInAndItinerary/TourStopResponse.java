package com.example.vnuguideapp.dto.reponse.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.dto.reponse.PlaceAndMapping.PlaceResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopResponse {
    private Long id;
    private Long tourId;
    private Long placeId;
    private String placeName;
    private Integer sequenceOrder;
    private String note;

    // Optional: full place details for detailed view
    private PlaceResponse place;
}
