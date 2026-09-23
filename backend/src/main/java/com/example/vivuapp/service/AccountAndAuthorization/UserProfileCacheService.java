package com.example.vivuapp.service.AccountAndAuthorization;

import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vivuapp.repository.AccountAndAuthorization.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Service for caching user profile information used in chat messaging.
 * Uses Spring Cache with Caffeine to prevent memory leaks and ensure data
 * freshness.
 * 
 * Cache TTL: 5 minutes (configured in CacheConfig)
 * Max entries: 10,000 (configured in CacheConfig)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileCacheService {

    private final UserProfileRepository userProfileRepository;

    /**
     * Cached user info for messaging - contains display name and avatar URL.
     */
    public record CachedUserInfo(
            Long userId,
            String displayName,
            String avatarUrl) {
    }

    /**
     * Get cached user profile info for messaging.
     * Cache key is the userId, value is the CachedUserInfo record.
     * 
     * @param userId The user ID to lookup
     * @param user   The User entity (to get name without additional query)
     * @return CachedUserInfo containing display name and avatar URL
     */
    @Cacheable(value = "userProfiles", key = "#userId")
    public CachedUserInfo getCachedUserInfo(Long userId, User user) {
        log.debug("Cache miss for user profile: {}", userId);

        String avatarUrl = userProfileRepository.findByUserId(userId)
                .map(UserProfile::getAvatarUrl)
                .orElse(null);

        String displayName = user.getFirstName() + " " + user.getLastName();

        return new CachedUserInfo(userId, displayName, avatarUrl);
    }

    /**
     * Get cached user profile info by userId only.
     * Use this when User entity is not readily available.
     * 
     * @param userId The user ID to lookup
     * @return CachedUserInfo or null if user not found
     */
    @Cacheable(value = "userProfiles", key = "#userId", unless = "#result == null")
    public CachedUserInfo getCachedUserInfoById(Long userId) {
        log.debug("Cache miss for user profile (by ID only): {}", userId);

        return userProfileRepository.findWithLinksByUserId(userId)
                .map(profile -> new CachedUserInfo(
                        userId,
                        profile.getDisplayName() != null
                                ? profile.getDisplayName()
                                : profile.getUser().getFirstName() + " " + profile.getUser().getLastName(),
                        profile.getAvatarUrl()))
                .orElse(null);
    }

    /**
     * Evict cache when user updates their profile.
     * Call this from ProfileService when profile is modified.
     * 
     * @param userId The user ID whose cache should be evicted
     */
    @CacheEvict(value = "userProfiles", key = "#userId")
    public void evictUserProfileCache(Long userId) {
        log.debug("Evicted cache for user profile: {}", userId);
    }

    /**
     * Evict all user profile caches.
     * Use sparingly - only for admin operations or migrations.
     */
    @CacheEvict(value = "userProfiles", allEntries = true)
    public void evictAllUserProfileCaches() {
        log.info("Evicted all user profile caches");
    }
}
