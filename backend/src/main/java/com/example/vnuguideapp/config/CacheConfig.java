package com.example.vnuguideapp.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuration for Spring Cache with Caffeine.
 * Provides managed caching with TTL and eviction policies to prevent memory
 * leaks.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Configure Caffeine cache manager with optimal settings for chat system:
     * - Maximum 10,000 entries to bound memory usage
     * - Entries expire 5 minutes after write for freshness
     * - Stats recording enabled for monitoring via actuator
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(5, TimeUnit.MINUTES)
                .recordStats());

        // Pre-register known cache names for better management
        cacheManager.setCacheNames(java.util.List.of(
                "userProfiles", // User profile info for messaging
                "relationshipFlags" // Blocked/friend status between users
        ));

        return cacheManager;
    }
}
