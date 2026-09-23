package com.example.vivuapp.repository.PostAndInteractions;

import com.example.vivuapp.entity.PostAndInteractions.PostShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostShareRepository extends JpaRepository<PostShare, Long> {
}

