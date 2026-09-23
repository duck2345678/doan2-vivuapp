package com.example.vnuguideapp.repository.AccountAndAuthorization;

import com.example.vnuguideapp.entity.AccountAndAuthorization.UserProfile;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for UserProfile entity
 */
@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

  /**
   * Find profile by user ID
   */
  Optional<UserProfile> findByUserId(Long userId);

  /**
   * Find profile by user ID with links eagerly loaded
   */
  @EntityGraph(attributePaths = { "links", "user" })
  Optional<UserProfile> findWithLinksByUserId(Long userId);

  /**
   * Find profile by username
   */
  Optional<UserProfile> findByUserUsername(String username);

  /**
   * Check if profile exists for user
   */
  boolean existsByUserId(Long userId);
}
