package com.example.vivuapp.repository.ChatAndActivity;

import com.example.vivuapp.entity.ChatAndActivity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {

        @EntityGraph(attributePaths = { "attachments", "attachments.file", "sender" })
        Slice<Message> findAllByConversationId(String conversationId, Pageable pageable);

        @Query("SELECT m FROM Message m WHERE m.id = :messageId AND m.sender.id = :userId")
        Optional<Message> findByIdAndSenderId(@Param("messageId") Long messageId, @Param("userId") Long userId);

        /**
         * Find message by conversation ID and client message ID for idempotency check.
         * Returns existing message if client retried with same clientMessageId.
         */
        @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId AND m.clientMessageId = :clientMessageId")
        Optional<Message> findByConversationIdAndClientMessageId(
                        @Param("conversationId") String conversationId,
                        @Param("clientMessageId") String clientMessageId);

        /**
         * Search messages in a conversation using ILIKE (case-insensitive, Vietnamese
         * support)
         */
        @Query("""
                        SELECT m FROM Message m
                        WHERE m.conversation.id = :conversationId
                        AND m.isActive = true
                        AND LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%'))
                        ORDER BY m.createdAt DESC
                        """)
        Slice<Message> searchMessagesInConversation(
                        @Param("conversationId") String conversationId,
                        @Param("keyword") String keyword,
                        Pageable pageable);
}
