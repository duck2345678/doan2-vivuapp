package com.example.vnuguideapp.dto.reponse.PostAndInteractions;

import lombok.Builder;

@Builder
public record SavedPostResponse(
    Long postId,
    Long userId,
    boolean isSaved) {
}
