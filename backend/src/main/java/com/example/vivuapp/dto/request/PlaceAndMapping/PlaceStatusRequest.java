package com.example.vivuapp.dto.request.PlaceAndMapping;

import com.example.vivuapp.enums.PlaceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceStatusRequest {

    @NotNull(message = "Status is required")
    private PlaceStatus status;
}
