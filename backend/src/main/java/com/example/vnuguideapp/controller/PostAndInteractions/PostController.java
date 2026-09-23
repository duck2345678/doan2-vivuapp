package com.example.vnuguideapp.controller.PostAndInteractions;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.PostAndInteractions.CommentResponse;
import com.example.vnuguideapp.dto.reponse.PostAndInteractions.PostResponse;
import com.example.vnuguideapp.dto.reponse.PostAndInteractions.SavedPostResponse;
import com.example.vnuguideapp.dto.reponse.PostAndInteractions.SharePostResponse;
import com.example.vnuguideapp.dto.request.PostAndInteractions.PostLocationRequest;
import com.example.vnuguideapp.dto.request.PostAndInteractions.SharePostRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.enums.PostType;
import com.example.vnuguideapp.enums.Visibility;
import com.example.vnuguideapp.service.PostAndInteractions.CommentService;
import com.example.vnuguideapp.service.PostAndInteractions.PostService;
import com.example.vnuguideapp.exception.exceptionImpl.BadRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.Arrays;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/posts")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Posts", description = "Post creation, updates, and interactions")
@SecurityRequirement(name = "bearerAuth")
public class PostController {

        PostService postService;
        ObjectMapper objectMapper;
        CommentService commentService;

        @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        @ResponseStatus(HttpStatus.CREATED)
        public ApiResponse<PostResponse> createPostWithFiles(
                        @AuthenticationPrincipal User user,
                        @RequestParam(value = "content", required = false) String content,
                        @RequestParam(value = "postType") String postType,
                        @RequestParam(value = "visibility") String visibility,
                        @RequestParam(value = "tourId", required = false) String tourId,
                        @RequestParam(value = "locations", required = false) String locationsJson,
                        @RequestPart(value = "files", required = false) List<MultipartFile> files) {
                List<PostLocationRequest> locations = parseLocations(locationsJson);
                PostResponse response = postService.createPostWithFiles(
                                user,
                                content,
                                PostType.valueOf(postType),
                                Visibility.valueOf(visibility),
                                tourId != null ? Long.parseLong(tourId) : null,
                                locations,
                                files);
                return ApiResponse.<PostResponse>builder()
                                .code(200)
                                .message("Post created successfully")
                                .result(response)
                                .build();
        }

        @GetMapping("/{postId}")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<PostResponse> getPostById(
                        @PathVariable Long postId,
                        @AuthenticationPrincipal User user) {
                PostResponse response = postService.getPostById(postId, user);
                return ApiResponse.<PostResponse>builder()
                                .code(200)
                                .message("Post retrieved successfully")
                                .result(response)
                                .build();
        }

        @GetMapping("/{postId}/comments")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<Slice<CommentResponse>> getCommentsByPostId(
                        @PathVariable Long postId,
                        @AuthenticationPrincipal User user,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<CommentResponse> response = commentService.getCommentsByPostId(postId, pageable, user);
                return ApiResponse.<Slice<CommentResponse>>builder()
                                .code(200)
                                .message("Comments retrieved successfully")
                                .result(response)
                                .build();
        }

        @GetMapping
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<Slice<PostResponse>> getFeed(
                        @AuthenticationPrincipal User user,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<PostResponse> response = postService.getFeed(user, pageable);
                return ApiResponse.<Slice<PostResponse>>builder()
                                .code(200)
                                .message("Feed retrieved successfully")
                                .result(response)
                                .build();
        }

        @GetMapping("/me")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<Slice<PostResponse>> getMyPosts(
                        @AuthenticationPrincipal User user,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<PostResponse> response = postService.getMyPosts(user, pageable);
                return ApiResponse.<Slice<PostResponse>>builder()
                                .code(200)
                                .message("My posts retrieved successfully")
                                .result(response)
                                .build();
        }

        @GetMapping("/user/{userId}")
        @ResponseStatus(HttpStatus.OK)
        @Operation(summary = "Get posts by user ID", description = "Retrieves all public posts from a specific user")
        public ApiResponse<Slice<PostResponse>> getPostsByUserId(
                        @PathVariable Long userId,
                        @AuthenticationPrincipal User currentUser,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<PostResponse> response = postService.getPostsByUserId(userId, currentUser, pageable);
                return ApiResponse.<Slice<PostResponse>>builder()
                                .code(200)
                                .message("User posts retrieved successfully")
                                .result(response)
                                .build();
        }

        @PostMapping("/{postId}/save")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<SavedPostResponse> toggleSavePost(
                        @PathVariable Long postId,
                        @AuthenticationPrincipal User user) {
                SavedPostResponse response = postService.toggleSavePost(user, postId);
                return ApiResponse.<SavedPostResponse>builder()
                                .code(200)
                                .message(response.isSaved() ? "Post saved" : "Post unsaved")
                                .result(response)
                                .build();
        }

        @PostMapping("/{postId}/share")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<SharePostResponse> sharePost(
                        @PathVariable Long postId,
                        @AuthenticationPrincipal User user,
                        @RequestBody @Valid SharePostRequest request) {
                SharePostResponse response = postService.sharePost(user, postId, request);
                return ApiResponse.<SharePostResponse>builder()
                                .code(200)
                                .message("Post shared successfully")
                                .result(response)
                                .build();
        }

        @GetMapping("/me/saved-posts")
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<Slice<PostResponse>> getSavedPosts(
                        @AuthenticationPrincipal User user,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<PostResponse> response = postService.getSavedPosts(user, pageable);
                return ApiResponse.<Slice<PostResponse>>builder()
                                .code(200)
                                .message("Saved posts retrieved successfully")
                                .result(response)
                                .build();
        }

        @DeleteMapping("/{post_id}")
        @ResponseStatus(HttpStatus.NO_CONTENT)
        public ApiResponse<Void> deletePost(
                        @PathVariable("post_id") Long postId,
                        @AuthenticationPrincipal User user) {
                postService.deletePost(postId, user);
                return ApiResponse.<Void>builder()
                                .code(204)
                                .message("Post deleted successfully")
                                .build();
        }

        @PutMapping(value = "/{post_id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        @ResponseStatus(HttpStatus.OK)
        public ApiResponse<PostResponse> updatePost(
                        @PathVariable("post_id") Long postId,
                        @AuthenticationPrincipal User user,
                        @RequestParam(value = "content", required = false) String content,
                        @RequestParam(value = "postType") String postType,
                        @RequestParam(value = "visibility") String visibility,
                        @RequestParam(value = "tourId", required = false) String tourId,
                        @RequestParam(value = "locations", required = false) String locationsJson,
                        @RequestPart(value = "files", required = false) List<MultipartFile> files) {
                List<PostLocationRequest> locations = parseLocations(locationsJson);
                PostResponse response = postService.updatePost(
                                postId,
                                user,
                                PostType.valueOf(postType),
                                Visibility.valueOf(visibility),
                                content,
                                tourId != null ? Long.parseLong(tourId) : null,
                                locations,
                                files);
                return ApiResponse.<PostResponse>builder()
                                .code(200)
                                .message("Post updated successfully")
                                .result(response)
                                .build();
        }

        private List<PostLocationRequest> parseLocations(String locationsJson) {
                if (locationsJson == null) {
                        return null;
                }
                if (locationsJson.isBlank()) {
                        return List.of();
                }
                try {
                        PostLocationRequest[] locations = objectMapper.readValue(
                                        locationsJson, PostLocationRequest[].class);
                        return Arrays.asList(locations);
                } catch (Exception ex) {
                        throw new BadRequestException("Invalid locations format");
                }
        }
}
