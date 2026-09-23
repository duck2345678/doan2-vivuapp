package com.example.vivuapp.dto.reponse.PlaceAndMapping;

import com.example.vivuapp.enums.PlaceSuggestionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceSuggestionResponse {
    private Long id;
    private Long suggestedById;
    private String suggestedByName;
    private String placeName;
    private PlaceTypeResponse placeType;
    private ProvinceResponse province;
    private DistrictResponse district;
    private WardResponse ward;
    private String addressDetail;
    private Double latitude;
    private Double longitude;
    private String description;
    private PlaceSuggestionStatus status;
    private String rejectionReason;
    private Long reviewedById;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
