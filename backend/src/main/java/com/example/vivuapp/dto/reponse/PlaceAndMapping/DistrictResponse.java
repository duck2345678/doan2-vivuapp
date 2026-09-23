package com.example.vivuapp.dto.reponse.PlaceAndMapping;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DistrictResponse {
    private Long id;
    private String name;
    private Long provinceId;
}
