package com.example.vnuguideapp.repository.PostAndInteractions;

import com.example.vnuguideapp.entity.PostAndInteractions.Post;
import com.example.vnuguideapp.enums.Visibility;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    Optional<Post> findByIdAndUserId(Long postId, Long userId);

    @Query("SELECT MAX(p.createdAt) FROM Post p WHERE p.user.id = :userId")
    LocalDateTime findLastPostTimeByUserId(@Param("userId") Long userId);

    Slice<Post> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Slice<Post> findByUserIdAndVisibilityInOrderByCreatedAtDesc(Long userId, List<Visibility> visibilities, Pageable pageable);

    Slice<Post> findByVisibilityInOrderByCreatedAtDesc(List<Visibility> visibilities, Pageable pageable);

    // Admin dashboard stats
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
