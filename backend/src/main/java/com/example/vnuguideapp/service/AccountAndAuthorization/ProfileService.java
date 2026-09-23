package com.example.vnuguideapp.service.AccountAndAuthorization;

import com.example.vnuguideapp.dto.reponse.AccountAndAuthorization.ProfileLinkResponse;
import com.example.vnuguideapp.dto.reponse.AccountAndAuthorization.ProfileResponse;
import com.example.vnuguideapp.dto.request.AccountAndAuthorization.ProfileLinkRequest;
import com.example.vnuguideapp.dto.request.AccountAndAuthorization.UpdateProfileRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.ProfileLink;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vnuguideapp.entity.Storage.FileEntity;
import com.example.vnuguideapp.enums.FileCategory;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserConnectionRepository;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vnuguideapp.repository.PostAndInteractions.PostRepository;
import com.example.vnuguideapp.service.File.FileStorageService;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Service for managing user profiles
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ProfileService {

    UserProfileRepository profileRepository;
    UserConnectionRepository connectionRepository;
    PostRepository postRepository;
    FileStorageService fileStorageService;

    /**
     * Get current user's profile
     */
    public ProfileResponse getMyProfile(User currentUser) {
        UserProfile profile = profileRepository.findWithLinksByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found for user: " + currentUser.getId()));

        return mapToProfileResponse(profile, currentUser, false);
    }

    /**
     * Get profile by user ID (for viewing other users' profiles)
     */
    public ProfileResponse getProfile(Long userId, User currentUser) {
        UserProfile profile = profileRepository.findWithLinksByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found for user: " + userId));

        // Check if current user is viewing their own profile
        boolean isOwnProfile = currentUser != null && currentUser.getId().equals(userId);

        return mapToProfileResponse(profile, currentUser, !isOwnProfile);
    }

    /**
     * Update current user's profile
     */
    @Transactional
    public ProfileResponse updateProfile(UpdateProfileRequest request, User currentUser) {
        UserProfile profile = profileRepository.findWithLinksByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found for user: " + currentUser.getId()));

        // Update basic fields if provided
        if (request.displayName() != null) {
            profile.setDisplayName(request.displayName());
        }
        if (request.bio() != null) {
            profile.setBio(request.bio());
        }
        if (request.avatarUrl() != null) {
            profile.setAvatarUrl(request.avatarUrl());
        }
        if (request.coverUrl() != null) {
            profile.setCoverUrl(request.coverUrl());
        }
        if (request.podcastUrl() != null) {
            profile.setPodcastUrl(request.podcastUrl());
        }
        if (request.isPrivate() != null) {
            profile.setIsPrivate(request.isPrivate());
        }
        if (request.interests() != null) {
            profile.setInterests(new ArrayList<>(request.interests()));
        }

        // Update links if provided
        if (request.links() != null) {
            updateProfileLinks(profile, request.links());
        }

        UserProfile savedProfile = profileRepository.save(profile);
        log.info("Updated profile for user: {}", currentUser.getId());

        return mapToProfileResponse(savedProfile, currentUser, false);
    }

    /**
     * Upload avatar image
     */
    @Transactional
    public ProfileResponse uploadAvatar(MultipartFile file, User currentUser) {
        UserProfile profile = profileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found for user: " + currentUser.getId()));

        FileEntity uploadedFile = fileStorageService.uploadFile(file, FileCategory.PROFILE_AVATAR);
        profile.setAvatarUrl(uploadedFile.getFileUrl());

        UserProfile savedProfile = profileRepository.save(profile);
        log.info("Updated avatar for user: {}", currentUser.getId());

        return mapToProfileResponse(savedProfile, currentUser, false);
    }

    /**
     * Upload cover image
     */
    @Transactional
    public ProfileResponse uploadCover(MultipartFile file, User currentUser) {
        UserProfile profile = profileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found for user: " + currentUser.getId()));

        FileEntity uploadedFile = fileStorageService.uploadFile(file, FileCategory.PROFILE_COVER);
        profile.setCoverUrl(uploadedFile.getFileUrl());

        UserProfile savedProfile = profileRepository.save(profile);
        log.info("Updated cover for user: {}", currentUser.getId());

        return mapToProfileResponse(savedProfile, currentUser, false);
    }

    /**
     * Update profile links - replace all links with new ones
     */
    private void updateProfileLinks(UserProfile profile, List<ProfileLinkRequest> linkRequests) {
        // Clear existing links
        profile.clearLinks();

        // Add new links
        AtomicInteger order = new AtomicInteger(0);
        linkRequests.forEach(linkRequest -> {
            ProfileLink link = ProfileLink.builder()
                    .title(linkRequest.title())
                    .url(linkRequest.url())
                    .displayOrder(order.getAndIncrement())
                    .build();
            profile.addLink(link);
        });
    }

    /**
     * Map UserProfile entity to ProfileResponse DTO
     */
    private ProfileResponse mapToProfileResponse(UserProfile profile, User currentUser, boolean checkFollowing) {
        User profileUser = profile.getUser();
        Long userId = profileUser.getId();

        // Get counts
        Long followersCount = connectionRepository.countFollowersByUserId(userId);
        Long followingCount = connectionRepository.countFollowingByUserId(userId);

        // For now, posts count is a simple count from PostRepository
        // This can be optimized with a specific count query
        long postsCount = postRepository.findByUserIdOrderByCreatedAtDesc(userId, null).getNumberOfElements();

        // Check if current user is following this profile
        Boolean isFollowing = null;
        if (checkFollowing && currentUser != null && !currentUser.getId().equals(userId)) {
            isFollowing = connectionRepository.existsByUserIdAndConnectedUserId(currentUser.getId(), userId);
        }

        // Map links
        List<ProfileLinkResponse> linkResponses = profile.getLinks().stream()
                .map(link -> ProfileLinkResponse.builder()
                        .id(link.getId().toString())
                        .title(link.getTitle())
                        .url(link.getUrl())
                        .build())
                .collect(Collectors.toList());

        return ProfileResponse.builder()
                .id(profile.getId())
                .userId(userId)
                .username(profileUser.getUsername())
                .displayName(profile.getDisplayName())
                .bio(profile.getBio())
                .avatarUrl(profile.getAvatarUrl())
                .coverUrl(profile.getCoverUrl())
                .postsCount(Math.toIntExact(postsCount))
                .followersCount(followersCount.intValue())
                .followingCount(followingCount.intValue())
                .isFollowing(isFollowing)
                .interests(profile.getInterests())
                .links(linkResponses)
                .podcastUrl(profile.getPodcastUrl())
                .isPrivate(profile.getIsPrivate())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
