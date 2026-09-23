package com.example.vivuapp.controller.PostAndInteractions;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.PostAndInteractions.CommentResponse;
import com.example.vivuapp.dto.request.PostAndInteractions.CommentRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.service.PostAndInteractions.CommentService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/comments")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Comments", description = "Comment management with realtime updates")
@SecurityRequirement(name = "bearerAuth")
public class CommentController {

        CommentService commentService;

        @Operation(summary = "Create comment", description = "Add comment to post. WebSocket: Broadcasts to /topic/post.{postId}.comments")
        @PostMapping
        @ResponseStatus(HttpStatus.CREATED)
        public ApiResponse<CommentResponse> createComment(
                        @AuthenticationPrincipal User user,
                        @RequestBody @Valid CommentRequest commentRequest) {
                CommentResponse response = commentService.createComment(user, commentRequest);
                return ApiResponse.<CommentResponse>builder()
                                .code(201)
                                .message("Comment created successfully")
                                .result(response)
                                .build();
        }

        @Operation(summary = "Update comment", description = "Edit comment content. WebSocket: Broadcasts to /topic/post.{postId}.comments")
        @PutMapping("/{commentId}")
        public ApiResponse<CommentResponse> updateComment(
                        @PathVariable Long commentId,
                        @AuthenticationPrincipal User user,
                        @RequestBody @Valid CommentRequest commentRequest) {
                CommentResponse response = commentService.updateComment(user, commentId, commentRequest);
                return ApiResponse.<CommentResponse>builder()
                                .code(200)
                                .message("Comment updated successfully")
                                .result(response)
                                .build();
        }

        @GetMapping("/{commentId}/replies")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<Slice<CommentResponse>> getReplies(
                        @PathVariable Long commentId,
                        @AuthenticationPrincipal User user,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<CommentResponse> response = commentService.getReplies(commentId, pageable, user);
                return ApiResponse.<Slice<CommentResponse>>builder()
                                .code(200)
                                .message("Replies retrieved successfully")
                                .result(response)
                                .build();
        }

        @DeleteMapping("/{commentId}")
        @ResponseStatus(HttpStatus.NO_CONTENT)
        public ApiResponse<Void> deleteComment(
                        @PathVariable Long commentId,
                        @AuthenticationPrincipal User user) {
                commentService.deleteComment(user, commentId);
                return ApiResponse.<Void>builder()
                                .code(204)
                                .message("Comment deleted successfully")
                                .build();
        }
}
