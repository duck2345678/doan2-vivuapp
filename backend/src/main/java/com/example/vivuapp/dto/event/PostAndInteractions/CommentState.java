package com.example.vivuapp.dto.event.PostAndInteractions;

import lombok.Builder;

@Builder
public record CommentState(
        Long commentId,
        Long commentCount,
        Long reactionCount
) {
}
