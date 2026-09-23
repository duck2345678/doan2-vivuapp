package com.example.vnuguideapp.dto.reponse.PostAndInteractions;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReactionResponse(
        Long reactionId,
        Long userId,
        Long postId,
        Long commentId
) {
}
