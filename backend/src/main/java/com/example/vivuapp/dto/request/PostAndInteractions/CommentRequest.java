package com.example.vivuapp.dto.request.PostAndInteractions;

public record CommentRequest(
        String content,
        Long postId,
        Long parentCommentId
) {
}
