package com.example.vnuguideapp.repository.PostAndInteractions;

import com.example.vnuguideapp.entity.PostAndInteractions.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostImageRepository extends JpaRepository<PostMedia, Long> {
}

