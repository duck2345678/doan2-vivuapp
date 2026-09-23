package com.example.vnuguideapp.repository.AccountAndAuthorization;

import com.example.vnuguideapp.entity.AccountAndAuthorization.Relationship;
import com.example.vnuguideapp.entity.AccountAndAuthorization.RelationshipId;
import com.example.vnuguideapp.enums.RelationshipStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for managing relationships between users.
 * Supports the two-row model where each user has their own relationship record.
 */
@Repository
public interface RelationshipRepository extends JpaRepository<Relationship, RelationshipId> {

        /**
         * Find a specific relationship between two users.
         */
        Optional<Relationship> findById_RequesterIdAndId_AddresseeId(Long requesterId, Long addresseeId);

        /**
         * Find all outgoing relationships for a user (where they are the requester).
         */
        List<Relationship> findAllById_RequesterId(Long requesterId);

        /**
         * Find all incoming relationships for a user (where they are the addressee).
         * Note: In two-row model, use findAllById_RequesterId with the user's ID to get
         * their view.
         */
        List<Relationship> findAllById_AddresseeId(Long addresseeId);

        /**
         * Find relationships by requester and status.
         */
        Slice<Relationship> findById_RequesterIdAndStatus(Long requesterId, RelationshipStatus status,
                        Pageable pageable);

        /**
         * Check if two users are friends (both have ACCEPTED status).
         */
        @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Relationship r " +
                        "WHERE r.id.requesterId = :userId AND r.id.addresseeId = :targetId AND r.status = 'ACCEPTED'")
        boolean areFriends(@Param("userId") Long userId, @Param("targetId") Long targetId);

        /**
         * Check if user has blocked target.
         */
        @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Relationship r " +
                        "WHERE r.id.requesterId = :userId AND r.id.addresseeId = :targetId AND r.status = 'BLOCKED'")
        boolean isBlocked(@Param("userId") Long userId, @Param("targetId") Long targetId);

        /**
         * Check if target has blocked user (reverse direction).
         */
        @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Relationship r " +
                        "WHERE r.id.requesterId = :targetId AND r.id.addresseeId = :userId AND r.status = 'BLOCKED'")
        boolean isBlockedBy(@Param("userId") Long userId, @Param("targetId") Long targetId);

        /**
         * Check if there's a pending friend request from user to target.
         */
        @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Relationship r " +
                        "WHERE r.id.requesterId = :userId AND r.id.addresseeId = :targetId AND r.status = 'PENDING_OUTGOING'")
        boolean hasPendingRequest(@Param("userId") Long userId, @Param("targetId") Long targetId);

        /**
         * Get all friends (users with ACCEPTED status).
         */
        @Query("SELECT r FROM Relationship r WHERE r.id.requesterId = :userId AND r.status = 'ACCEPTED'")
        Slice<Relationship> findFriends(@Param("userId") Long userId, Pageable pageable);

        /**
         * Get incoming friend requests.
         */
        @Query("SELECT r FROM Relationship r WHERE r.id.requesterId = :userId AND r.status = 'PENDING_INCOMING'")
        Slice<Relationship> findIncomingRequests(@Param("userId") Long userId, Pageable pageable);

        /**
         * Get outgoing friend requests.
         */
        @Query("SELECT r FROM Relationship r WHERE r.id.requesterId = :userId AND r.status = 'PENDING_OUTGOING'")
        Slice<Relationship> findOutgoingRequests(@Param("userId") Long userId, Pageable pageable);

        /**
         * Delete both rows of a relationship (called when unfriending).
         */
        void deleteById_RequesterIdAndId_AddresseeId(Long requesterId, Long addresseeId);

        /**
         * Count friends for a user.
         */
        @Query("SELECT COUNT(r) FROM Relationship r WHERE r.id.requesterId = :userId AND r.status = 'ACCEPTED'")
        long countFriends(@Param("userId") Long userId);

        /**
         * Count pending incoming requests.
         */
        @Query("SELECT COUNT(r) FROM Relationship r WHERE r.id.requesterId = :userId AND r.status = 'PENDING_INCOMING'")
        long countPendingIncoming(@Param("userId") Long userId);

        // ==================== OPTIMIZED COMBINED QUERIES ====================

        /**
         * Check blocking AND friendship status in a single round-trip.
         * Returns the relationship status if exists, null otherwise.
         * Use RelationshipService.getRelationshipFlags() for convenient access.
         *
         * @param userId   The requesting user
         * @param targetId The target user
         * @return Optional containing the status, or empty if no relationship
         */
        @Query("SELECT r.status FROM Relationship r WHERE r.id.requesterId = :userId AND r.id.addresseeId = :targetId")
        Optional<RelationshipStatus> findStatusByUserIds(@Param("userId") Long userId,
                        @Param("targetId") Long targetId);

        /**
         * Check if target has blocked user (reverse direction) - optimized.
         * Also returns the status for caching purposes.
         */
        @Query("SELECT r.status FROM Relationship r WHERE r.id.requesterId = :targetId AND r.id.addresseeId = :userId")
        Optional<RelationshipStatus> findReverseStatusByUserIds(@Param("userId") Long userId,
                        @Param("targetId") Long targetId);
}
