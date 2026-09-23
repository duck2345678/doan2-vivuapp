package com.example.vivuapp.dto.reponse.PostAndInteractions;

import com.example.vivuapp.enums.PostType;
import com.example.vivuapp.enums.Visibility;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PostResponse(
        Long id,
        String content,
        PostType postType,
        Visibility visibility,
        Long authorId,
        String authorName,
        String authorAvatarUrl,
        List<String> mediaUrls,
        List<PostLocationResponse> locations,
        Long reactionCount,
        Long commentCount,
        Boolean isLiked,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
