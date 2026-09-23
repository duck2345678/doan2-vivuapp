package com.example.vnuguideapp.dto.reponse.TourAndCheckInAndItinerary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInResponse {
    private Long id;
    private Long userId;
    private Long tourId;
    private Long placeId;
    private String placeName;
    private LocalDateTime checkedInAt;
    private String note;
}
