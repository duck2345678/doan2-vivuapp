package com.example.vivuapp.dto.request.PlaceAndMapping;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceSuggestionRequest {

    @NotBlank(message = "Place name is required")
    @Size(max = 200, message = "Place name must be at most 200 characters")
    private String placeName;

    private Long typeId;

    private Long areaId;

    private Long provinceId;

    private Long districtId;

    private Long wardId;

    private String addressDetail;

    private Double latitude;

    private Double longitude;

    private String description;

    // Images can be handled separately via file upload
}
