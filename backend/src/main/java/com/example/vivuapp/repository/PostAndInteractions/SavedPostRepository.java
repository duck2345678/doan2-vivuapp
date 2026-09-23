package com.example.vivuapp.repository.PostAndInteractions;

import com.example.vivuapp.entity.PostAndInteractions.SavedPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SavedPostRepository extends JpaRepository<SavedPost, Long> {

  Optional<SavedPost> findByUserIdAndPostId(Long userId, Long postId);

  boolean existsByUserIdAndPostId(Long userId, Long postId);

  Slice<SavedPost> findByUserIdOrderBySavedAtDesc(Long userId, Pageable pageable);

  /**
   * Delete all saved posts for a post
   */
  void deleteByPostId(Long postId);
}
