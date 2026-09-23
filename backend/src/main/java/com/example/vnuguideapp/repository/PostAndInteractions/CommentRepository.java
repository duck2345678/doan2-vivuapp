package com.example.vnuguideapp.repository.PostAndInteractions;

import com.example.vnuguideapp.entity.PostAndInteractions.Comment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    Optional<Comment> findByIdAndUserId(Long commentId, Long id);

    Long countByPostId(Long postId);

    Long countByParentComment_Id(Long parentCommentId);

    Slice<Comment> findByPostIdAndParentCommentIsNullOrderByCreatedAtDesc(Long postId, Pageable pageable);

    Slice<Comment> findByParentCommentIdOrderByCreatedAtAsc(Long parentCommentId, Pageable pageable);

    /**
     * Find all comments for a post
     */
    java.util.List<Comment> findByPostId(Long postId);

    /**
     * Delete all comments for a post
     */
    void deleteByPostId(Long postId);
}
