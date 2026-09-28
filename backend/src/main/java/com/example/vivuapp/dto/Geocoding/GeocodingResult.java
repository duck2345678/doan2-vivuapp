package com.example.vivuapp.dto.Geocoding;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeocodingResult {
    private String name;
    private String displayName;
    private Double latitude;
    private Double longitude;
    private String city;
    private String country;
    private String osmId;
}
