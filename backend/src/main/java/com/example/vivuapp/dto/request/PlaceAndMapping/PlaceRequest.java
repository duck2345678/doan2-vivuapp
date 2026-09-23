package com.example.vivuapp.dto.request.PlaceAndMapping;

import com.example.vivuapp.enums.PlaceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 200, message = "Name must be at most 200 characters")
    private String name;

    @NotNull(message = "Place type ID is required")
    private Long typeId;

    private Long areaId;

    private Long provinceId;

    private Long districtId;

    private Long wardId;

    private String addressDetail;

    private Double latitude;

    private Double longitude;

    private String description;

    private PlaceStatus status;

    private Boolean isOfficial;

    private Long ownerUserId;
}
