package com.example.vivuapp.repository.ChatAndActivity;

import com.example.vivuapp.entity.ChatAndActivity.Conversation;
import com.example.vivuapp.enums.ParticipantStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, String> {

    @Query("""
            SELECT DISTINCT c FROM Conversation c
            JOIN FETCH c.participants allP
            JOIN FETCH allP.user
            LEFT JOIN FETCH c.lastMessage lm
            WHERE c.id IN (
                SELECT conv.id FROM Conversation conv
                JOIN conv.participants p
                WHERE p.user.id = :userId
            )
            ORDER BY lm.createdAt DESC NULLS LAST
            """)
    Slice<Conversation> findAllByParticipantUserId(
            @Param("userId") Long userId,
            Pageable pageable);

    @Query("""
                SELECT c FROM Conversation c
                JOIN c.participants p
                WHERE c.id = :conversationId AND p.user.id = :userId
            """)
    Optional<Conversation> findByIdAndParticipantUserId(@Param("conversationId") String conversationId,
            @Param("userId") Long userId);

    @Query("""
                SELECT c FROM Conversation c
                JOIN c.participants p1
                JOIN c.participants p2
                WHERE c.type = com.example.vivuapp.enums.ConversationType.DIRECT
                AND p1.user.id = :userId1
                AND p2.user.id = :userId2
            """)
    Optional<Conversation> findPrivateConversationBetweenUsers(@Param("userId1") Long userId1,
            @Param("userId2") Long userId2);

    @Query("""
            SELECT DISTINCT c FROM Conversation c
            JOIN FETCH c.participants allP
            JOIN FETCH allP.user
            LEFT JOIN FETCH c.lastMessage lm
            WHERE c.id IN (
                SELECT conv.id FROM Conversation conv
                JOIN conv.participants p
                WHERE p.user.id = :userId
                AND conv.type = :type
            )
            ORDER BY lm.createdAt DESC NULLS LAST
            """)
    Slice<Conversation> findByParticipantUserIdAndType(
            @Param("userId") Long userId,
            @Param("type") com.example.vivuapp.enums.ConversationType type,
            Pageable pageable);

    /**
     * Find conversations where the user is a participant with a specific status.
     * Used for filtering INBOX vs REQUEST conversations.
     */
    @Query("""
            SELECT DISTINCT c FROM Conversation c
            JOIN FETCH c.participants allP
            JOIN FETCH allP.user
            LEFT JOIN FETCH c.lastMessage lm
            WHERE c.id IN (
                SELECT conv.id FROM Conversation conv
                JOIN conv.participants p
                WHERE p.user.id = :userId
                AND p.status = :status
            )
            ORDER BY lm.createdAt DESC NULLS LAST
            """)
    Slice<Conversation> findByParticipantUserIdAndStatus(
            @Param("userId") Long userId,
            @Param("status") ParticipantStatus status,
            Pageable pageable);

    Long countByParticipantsConversationId(String conversationId);

    /**
     * Find a DIRECT conversation by its unique directKey.
     */
    Optional<Conversation> findByDirectKey(String directKey);

    // ==================== NEW OPTIMIZED QUERIES ====================

    /**
     * Find DIRECT conversation with only lastMessage fetched.
     * Use this for message sending to avoid fetching all participants.
     */
    @Query("""
            SELECT c FROM Conversation c
            LEFT JOIN FETCH c.lastMessage lm
            WHERE c.directKey = :directKey
            """)
    Optional<Conversation> findByDirectKeyWithLastMessage(@Param("directKey") String directKey);

    /**
     * Find conversation with pessimistic lock for deletion.
     * Prevents race condition when both users delete simultaneously.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Conversation c WHERE c.id = :id")
    Optional<Conversation> findByIdWithLock(@Param("id") String id);

    /**
     * Count active (non-DELETED) participants for cleanup decision.
     */
    @Query("""
            SELECT COUNT(p) FROM Participant p
            WHERE p.conversation.id = :conversationId
            AND p.status != com.example.vivuapp.enums.ParticipantStatus.DELETED
            """)
    long countActiveParticipants(@Param("conversationId") String conversationId);

}
