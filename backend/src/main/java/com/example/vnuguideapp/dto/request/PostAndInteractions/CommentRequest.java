package com.example.vnuguideapp.dto.request.PostAndInteractions;

public record CommentRequest(
        String content,
        Long postId,
        Long parentCommentId
) {
}
