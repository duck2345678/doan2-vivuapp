package com.example.vivuapp.dto.Geocoding;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeocodingResponse {
    private List<GeocodingResult> results;
}
