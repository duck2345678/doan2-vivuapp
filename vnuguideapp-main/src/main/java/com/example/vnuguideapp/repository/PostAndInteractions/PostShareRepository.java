package com.example.vnuguideapp.repository.PostAndInteractions;

import com.example.vnuguideapp.entity.PostAndInteractions.PostShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostShareRepository extends JpaRepository<PostShare, Long> {
}

