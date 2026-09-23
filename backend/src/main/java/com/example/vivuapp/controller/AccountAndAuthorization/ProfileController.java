package com.example.vivuapp.controller.AccountAndAuthorization;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.AccountAndAuthorization.ProfileResponse;
import com.example.vivuapp.dto.request.AccountAndAuthorization.UpdateProfileRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.service.AccountAndAuthorization.FollowService;
import com.example.vivuapp.service.AccountAndAuthorization.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * REST Controller for Profile management
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/profile")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Profile", description = "APIs for managing user profiles")
public class ProfileController {

    ProfileService profileService;
    FollowService followService;

    // ==================== Profile CRUD ====================

    @GetMapping("/me")
    @Operation(summary = "Get current user's profile", description = "Retrieve the profile of the currently authenticated user")
    public ResponseEntity<ApiResponse<ProfileResponse>> getMyProfile(
            @AuthenticationPrincipal User currentUser) {
        ProfileResponse profile = profileService.getMyProfile(currentUser);
        return ResponseEntity.ok(
                ApiResponse.<ProfileResponse>builder()
                        .code(200)
                        .message("Profile retrieved successfully")
                        .result(profile)
                        .build());
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Get user profile by ID", description = "Retrieve a user's profile by their user ID")
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        ProfileResponse profile = profileService.getProfile(userId, currentUser);
        return ResponseEntity.ok(
                ApiResponse.<ProfileResponse>builder()
                        .code(200)
                        .message("Profile retrieved successfully")
                        .result(profile)
                        .build());
    }

    @PutMapping
    @Operation(summary = "Update profile", description = "Update the current user's profile information")
    public ResponseEntity<ApiResponse<ProfileResponse>> updateProfile(
            @RequestBody @Valid UpdateProfileRequest request,
            @AuthenticationPrincipal User currentUser) {
        ProfileResponse profile = profileService.updateProfile(request, currentUser);
        return ResponseEntity.ok(
                ApiResponse.<ProfileResponse>builder()
                        .code(200)
                        .message("Profile updated successfully")
                        .result(profile)
                        .build());
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload avatar", description = "Upload a new avatar image for the current user")
    public ResponseEntity<ApiResponse<ProfileResponse>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        ProfileResponse profile = profileService.uploadAvatar(file, currentUser);
        return ResponseEntity.ok(
                ApiResponse.<ProfileResponse>builder()
                        .code(200)
                        .message("Avatar uploaded successfully")
                        .result(profile)
                        .build());
    }

    @PostMapping(value = "/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload cover image", description = "Upload a new cover image for the current user")
    public ResponseEntity<ApiResponse<ProfileResponse>> uploadCover(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        ProfileResponse profile = profileService.uploadCover(file, currentUser);
        return ResponseEntity.ok(
                ApiResponse.<ProfileResponse>builder()
                        .code(200)
                        .message("Cover uploaded successfully")
                        .result(profile)
                        .build());
    }

    // ==================== Follow/Unfollow ====================

    @PostMapping("/{userId}/follow")
    @Operation(summary = "Follow user", description = "Follow a user by their user ID")
    public ResponseEntity<ApiResponse<String>> followUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        followService.follow(userId, currentUser);
        return ResponseEntity.ok(
                ApiResponse.<String>builder()
                        .code(200)
                        .message("Successfully followed user")
                        .build());
    }

    @DeleteMapping("/{userId}/follow")
    @Operation(summary = "Unfollow user", description = "Unfollow a user by their user ID")
    public ResponseEntity<ApiResponse<String>> unfollowUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        followService.unfollow(userId, currentUser);
        return ResponseEntity.ok(
                ApiResponse.<String>builder()
                        .code(200)
                        .message("Successfully unfollowed user")
                        .build());
    }

    @GetMapping("/{userId}/followers")
    @Operation(summary = "Get followers", description = "Get paginated list of users who follow the specified user")
    public ResponseEntity<ApiResponse<Page<ProfileResponse>>> getFollowers(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ProfileResponse> followers = followService.getFollowers(userId, currentUser, pageable);
        return ResponseEntity.ok(
                ApiResponse.<Page<ProfileResponse>>builder()
                        .code(200)
                        .message("Followers retrieved successfully")
                        .result(followers)
                        .build());
    }

    @GetMapping("/{userId}/following")
    @Operation(summary = "Get following", description = "Get paginated list of users the specified user follows")
    public ResponseEntity<ApiResponse<Page<ProfileResponse>>> getFollowing(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ProfileResponse> following = followService.getFollowing(userId, currentUser, pageable);
        return ResponseEntity.ok(
                ApiResponse.<Page<ProfileResponse>>builder()
                        .code(200)
                        .message("Following retrieved successfully")
                        .result(following)
                        .build());
    }
}
