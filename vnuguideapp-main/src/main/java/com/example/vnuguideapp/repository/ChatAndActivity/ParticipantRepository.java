package com.example.vnuguideapp.repository.ChatAndActivity;

import com.example.vnuguideapp.entity.ChatAndActivity.Participant;
import com.example.vnuguideapp.enums.ParticipantRole;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {

        Optional<Participant> findByConversationIdAndUserId(String conversationId, Long userId);

        List<Participant> findByConversationId(String conversationId);

        boolean existsByConversationIdAndUserId(String conversationId, Long currentUserId);

        boolean existsByConversationIdAndUserIdAndRole(String conversationId, Long userId, ParticipantRole role);

        List<Participant> findByConversationIdAndRole(String conversationId, ParticipantRole role);

        @Query("SELECT CONCAT(p.user.firstName, ' ', p.user.lastName) FROM Participant p " +
                        "WHERE p.conversation.id = :conversationId AND p.user.id != :userId")
        String findOtherParticipantFullName(@Param("conversationId") String conversationId,
                        @Param("userId") Long userId);

        Long countByConversationId(String conversationId);

        // ==================== NEW OPTIMIZED QUERIES ====================

        /**
         * Find participant with user eagerly loaded.
         * Avoids N+1 when accessing participant.getUser() afterward.
         */
        @EntityGraph(attributePaths = { "user" })
        Optional<Participant> findWithUserByConversationIdAndUserId(String conversationId, Long userId);

        /**
         * Find only active (non-DELETED) participants with users eagerly loaded.
         * Use this for conversation list to avoid showing deleted participants.
         */
        @Query("""
                        SELECT p FROM Participant p
                        JOIN FETCH p.user
                        WHERE p.conversation.id = :conversationId
                        AND p.status != com.example.vnuguideapp.enums.ParticipantStatus.DELETED
                        """)
        List<Participant> findActiveByConversationId(@Param("conversationId") String conversationId);

        /**
         * Find participant by conversation and user with status check.
         * Returns empty if participant has DELETED status.
         */
        @Query("""
                        SELECT p FROM Participant p
                        WHERE p.conversation.id = :conversationId
                        AND p.user.id = :userId
                        AND p.status != com.example.vnuguideapp.enums.ParticipantStatus.DELETED
                        """)
        Optional<Participant> findActiveByConversationIdAndUserId(
                        @Param("conversationId") String conversationId,
                        @Param("userId") Long userId);
}
