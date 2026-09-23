package com.example.vnuguideapp.dto.event.PostAndInteractions;

import lombok.Builder;

@Builder
public record CommentState(
        Long commentId,
        Long commentCount,
        Long reactionCount
) {
}
