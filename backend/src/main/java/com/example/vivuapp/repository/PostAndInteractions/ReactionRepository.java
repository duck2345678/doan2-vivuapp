package com.example.vivuapp.repository.PostAndInteractions;

import com.example.vivuapp.entity.PostAndInteractions.Reaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReactionRepository extends JpaRepository<Reaction, Long> {
    Optional<Reaction> findByPostIdAndUserId(Long postId, Long id);

    Optional<Reaction> findByCommentIdAndUserId(Long commentId, Long id);

    Long countByPostId(Long postId);

    Long countByCommentId(Long commentId);

    /**
     * Find all reactions by a user for a list of posts
     */
    @Query("SELECT r.post.id FROM Reaction r WHERE r.user.id = :userId AND r.post.id IN :postIds")
    List<Long> findReactedPostIds(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);

    /**
     * Delete all reactions for a post
     */
    void deleteByPostId(Long postId);

    /**
     * Delete all reactions for a comment
     */
    void deleteByCommentId(Long commentId);
}
