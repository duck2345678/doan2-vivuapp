package com.example.vnuguideapp.dto.request.PostAndInteractions;


import com.example.vnuguideapp.enums.PostType;
import com.example.vnuguideapp.enums.Visibility;
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
