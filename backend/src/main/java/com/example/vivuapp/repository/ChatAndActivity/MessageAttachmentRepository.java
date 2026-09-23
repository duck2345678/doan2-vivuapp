package com.example.vivuapp.repository.ChatAndActivity;

import com.example.vivuapp.entity.ChatAndActivity.MessageAttachment;
import com.example.vivuapp.enums.FileType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment, Long> {

    List<MessageAttachment> findByMessageId(Long messageId);

    @Query("""
            SELECT ma FROM MessageAttachment ma
            JOIN FETCH ma.file f
            JOIN ma.message m
            WHERE m.conversation.id = :conversationId
            ORDER BY f.uploadedAt DESC
            """)
    List<MessageAttachment> findAllByConversationId(@Param("conversationId") String conversationId);

    @Query("""
            SELECT ma FROM MessageAttachment ma
            JOIN FETCH ma.file f
            JOIN ma.message m
            WHERE m.conversation.id = :conversationId AND f.fileType = :fileType
            ORDER BY f.uploadedAt DESC
            """)
    List<MessageAttachment> findAllByConversationIdAndFileType(
            @Param("conversationId") String conversationId,
            @Param("fileType") FileType fileType);

    @Query("SELECT f.fileUrl FROM MessageAttachment ma JOIN ma.file f JOIN ma.message m WHERE m.conversation.id = :conversationId")
    List<String> findAllFileUrlsByConversationId(@Param("conversationId") String conversationId);
}
