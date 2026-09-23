package com.example.vivuapp.dto.request.TourAndCheckInAndItinerary;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopReorderRequest {

    @NotEmpty(message = "Stops list cannot be empty")
    private List<StopOrderItem> stops;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StopOrderItem {
        private Long stopId;
        private Integer sequenceOrder;
    }
}
