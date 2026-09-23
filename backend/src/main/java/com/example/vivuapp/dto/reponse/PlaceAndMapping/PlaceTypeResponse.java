package com.example.vivuapp.dto.reponse.PlaceAndMapping;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceTypeResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String iconType;
}
