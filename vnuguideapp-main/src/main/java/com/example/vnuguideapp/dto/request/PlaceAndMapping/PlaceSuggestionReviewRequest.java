package com.example.vnuguideapp.dto.request.PlaceAndMapping;

import com.example.vnuguideapp.enums.PlaceSuggestionStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceSuggestionReviewRequest {

    @NotNull(message = "Status is required")
    private PlaceSuggestionStatus status;

    private String rejectionReason;

    /**
     * If true and status is APPROVED, create a Place from this suggestion
     */
    private Boolean createPlace;
}
