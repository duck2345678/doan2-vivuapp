package com.example.vivuapp.repository.PostAndInteractions;

import com.example.vivuapp.entity.PostAndInteractions.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostImageRepository extends JpaRepository<PostMedia, Long> {
}

