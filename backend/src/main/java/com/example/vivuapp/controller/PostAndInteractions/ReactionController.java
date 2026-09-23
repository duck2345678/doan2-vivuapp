package com.example.vivuapp.controller.PostAndInteractions;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.PostAndInteractions.LikeResponse;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.service.PostAndInteractions.ReactionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/likes")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Reactions", description = "Like/Unlike posts and comments with realtime updates")
@SecurityRequirement(name = "bearerAuth")
public class ReactionController {

        ReactionService reactionService;

        @Operation(summary = "Toggle like on post", description = "Like/unlike post. WebSocket: Broadcasts to /topic/post.{postId}.reactions")
        @PostMapping("/post/{postId}")
        public ApiResponse<LikeResponse> toggleLikePost(
                        @AuthenticationPrincipal User user,
                        @PathVariable Long postId) {
                LikeResponse response = reactionService.toggleLikePost(user, postId);
                return ApiResponse.<LikeResponse>builder()
                                .code(200)
                                .message(response.isLiked() ? "Liked" : "Unliked")
                                .result(response)
                                .build();
        }

        @Operation(summary = "Toggle like on comment", description = "Like/unlike comment. WebSocket: Broadcasts to /topic/post.{postId}.reactions")
        @PostMapping("/comment/{commentId}")
        public ApiResponse<LikeResponse> toggleLikeComment(
                        @AuthenticationPrincipal User user,
                        @PathVariable Long commentId) {
                LikeResponse response = reactionService.toggleLikeComment(user, commentId);
                return ApiResponse.<LikeResponse>builder()
                                .code(200)
                                .message(response.isLiked() ? "Liked" : "Unliked")
                                .result(response)
                                .build();
        }
}
