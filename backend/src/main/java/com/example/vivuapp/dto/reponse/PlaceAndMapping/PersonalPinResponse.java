package com.example.vivuapp.dto.reponse.PlaceAndMapping;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalPinResponse {
    private Long id;
    private String name;
    private Double latitude;
    private Double longitude;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
