package com.example.vnuguideapp.dto.event.PostAndInteractions;

import lombok.Builder;

@Builder
public record PostState(
        Long postId,
        Long commentCount,
        Long reactionCount
) {
}
