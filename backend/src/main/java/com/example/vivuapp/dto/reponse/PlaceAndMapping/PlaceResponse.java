package com.example.vivuapp.dto.reponse.PlaceAndMapping;

import com.example.vivuapp.enums.PlaceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceResponse {
    private Long id;
    private String googlePlaceId;
    private String name;
    private String imageUrl;
    private PlaceTypeResponse placeType;
    private ProvinceResponse province;
    private DistrictResponse district;
    private WardResponse ward;
    private String addressDetail;
    private Double latitude;
    private Double longitude;
    private String description;
    private PlaceStatus status;
    private Boolean isOfficial;
    private Long ownerUserId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
