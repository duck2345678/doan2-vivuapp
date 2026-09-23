package com.example.vnuguideapp.dto.request.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.enums.Visibility;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourShareRequest {

    @NotBlank(message = "Post title is required")
    private String postTitle;

    private Visibility visibility;
}
