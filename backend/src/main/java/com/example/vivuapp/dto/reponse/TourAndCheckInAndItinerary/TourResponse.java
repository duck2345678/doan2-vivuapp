package com.example.vivuapp.dto.reponse.TourAndCheckInAndItinerary;

import com.example.vivuapp.enums.TourStatus;
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
public class TourResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String name;
    private String description;
    private LocalDateTime startDate;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private TourStatus status;
    private Boolean sharedAsPost;
    private Long originalTourId;
    private List<TourStopResponse> stops;
    private String staticMapUrl; // Google Maps Static API URL for tour visualization
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
