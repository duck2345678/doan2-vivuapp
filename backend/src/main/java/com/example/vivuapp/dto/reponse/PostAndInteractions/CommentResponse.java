package com.example.vivuapp.dto.reponse.PostAndInteractions;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CommentResponse(
        Long id,
        String content,
        Long authorId,
        String authorName,
        String authorAvatarUrl,
        Long postId,
        Long parentCommentId,
        Integer likeCount,
        Boolean isLiked,
        LocalDateTime timeStamp
) {
}
