package com.example.vivuapp.dto.reponse.PostAndInteractions;

import lombok.Builder;

@Builder
public record LikeResponse(
    Long postId,
    Long commentId,
    Long userId,
    boolean isLiked,
    long likeCount) {
}
