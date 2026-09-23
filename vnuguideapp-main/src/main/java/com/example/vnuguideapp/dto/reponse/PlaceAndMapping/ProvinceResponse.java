package com.example.vnuguideapp.dto.reponse.PlaceAndMapping;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProvinceResponse {
    private Long id;
    private String name;
}
