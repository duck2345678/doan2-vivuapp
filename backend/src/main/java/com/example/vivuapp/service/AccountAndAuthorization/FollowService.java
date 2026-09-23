package com.example.vivuapp.service.AccountAndAuthorization;

import com.example.vivuapp.dto.reponse.AccountAndAuthorization.ProfileResponse;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.AccountAndAuthorization.UserConnection;
import com.example.vivuapp.exception.exceptionImpl.BadRequestException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.AccountAndAuthorization.UserConnectionRepository;
import com.example.vivuapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing follow/unfollow operations between users
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class FollowService {

    UserConnectionRepository connectionRepository;
    UserRepository userRepository;
    UserProfileRepository profileRepository;
    ProfileService profileService;

    /**
     * Follow a user
     */
    @Transactional
    public void follow(Long targetUserId, User currentUser) {
        // Validate not following self
        if (currentUser.getId().equals(targetUserId)) {
            throw new BadRequestException("Cannot follow yourself");
        }

        // Check if target user exists
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + targetUserId));

        // Check if already following
        if (connectionRepository.existsByUserIdAndConnectedUserId(currentUser.getId(), targetUserId)) {
            throw new BadRequestException("Already following this user");
        }

        // Create connection
        UserConnection connection = UserConnection.builder()
                .user(currentUser)
                .connectedUser(targetUser)
                .connectedSince(LocalDateTime.now())
                .build();

        connectionRepository.save(connection);
        log.info("User {} followed user {}", currentUser.getId(), targetUserId);
    }

    /**
     * Unfollow a user
     */
    @Transactional
    public void unfollow(Long targetUserId, User currentUser) {
        // Find the connection
        UserConnection connection = connectionRepository
                .findByUserIdAndConnectedUserId(currentUser.getId(), targetUserId)
                .orElseThrow(() -> new BadRequestException("Not following this user"));

        connectionRepository.delete(connection);
        log.info("User {} unfollowed user {}", currentUser.getId(), targetUserId);
    }

    /**
     * Get followers list with pagination
     */
    public Page<ProfileResponse> getFollowers(Long userId, User currentUser, Pageable pageable) {
        // Check if user exists
        if (!profileRepository.existsByUserId(userId)) {
            throw new ResourceNotFoundException("User not found: " + userId);
        }

        Page<UserConnection> connections = connectionRepository.findFollowersByUserId(userId, pageable);

        return connections.map(connection -> profileService.getProfile(connection.getUser().getId(), currentUser));
    }

    /**
     * Get following list with pagination
     */
    public Page<ProfileResponse> getFollowing(Long userId, User currentUser, Pageable pageable) {
        // Check if user exists
        if (!profileRepository.existsByUserId(userId)) {
            throw new ResourceNotFoundException("User not found: " + userId);
        }

        Page<UserConnection> connections = connectionRepository.findFollowingByUserId(userId, pageable);

        return connections
                .map(connection -> profileService.getProfile(connection.getConnectedUser().getId(), currentUser));
    }

    /**
     * Check if current user is following target user
     */
    public boolean isFollowing(Long targetUserId, User currentUser) {
        if (currentUser == null) {
            return false;
        }
        return connectionRepository.existsByUserIdAndConnectedUserId(currentUser.getId(), targetUserId);
    }
}
