package com.example.vnuguideapp.repository.AccountAndAuthorization;

import com.example.vnuguideapp.entity.AccountAndAuthorization.UserConnection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserConnectionRepository extends JpaRepository<UserConnection, Long> {

    /**
     * Find all connected user IDs for a given user
     */
    @Query("SELECT uc.connectedUser.id FROM UserConnection uc WHERE uc.user.id = :userId")
    List<Long> findConnectedUserIds(@Param("userId") Long userId);

    /**
     * Check if a connection exists between two users
     */
    @Query("SELECT COUNT(uc) > 0 FROM UserConnection uc WHERE uc.user.id = :userId AND uc.connectedUser.id = :connectedUserId")
    boolean existsByUserIdAndConnectedUserId(@Param("userId") Long userId,
            @Param("connectedUserId") Long connectedUserId);

    /**
     * Count followers for a user (users who follow this user)
     */
    @Query("SELECT COUNT(uc) FROM UserConnection uc WHERE uc.connectedUser.id = :userId")
    Long countFollowersByUserId(@Param("userId") Long userId);

    /**
     * Count following for a user (users this user follows)
     */
    @Query("SELECT COUNT(uc) FROM UserConnection uc WHERE uc.user.id = :userId")
    Long countFollowingByUserId(@Param("userId") Long userId);

    /**
     * Find connection between two users
     */
    Optional<UserConnection> findByUserIdAndConnectedUserId(Long userId, Long connectedUserId);

    /**
     * Get followers list with pagination
     */
    @Query("SELECT uc FROM UserConnection uc WHERE uc.connectedUser.id = :userId")
    Page<UserConnection> findFollowersByUserId(@Param("userId") Long userId, Pageable pageable);

    /**
     * Get following list with pagination
     */
    @Query("SELECT uc FROM UserConnection uc WHERE uc.user.id = :userId")
    Page<UserConnection> findFollowingByUserId(@Param("userId") Long userId, Pageable pageable);
}
