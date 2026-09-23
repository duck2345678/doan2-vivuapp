package com.example.vivuapp.dto.request.PostAndInteractions;


import com.example.vivuapp.enums.PostType;
import com.example.vivuapp.enums.Visibility;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PostRequest(
        String content,
        List<String> mediaUrls,
        @NotNull
        PostType postType,
        @NotNull
        Visibility visibility,
        Long tourId
) {
}
