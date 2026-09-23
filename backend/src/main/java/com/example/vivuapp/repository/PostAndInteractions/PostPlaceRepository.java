package com.example.vivuapp.repository.PostAndInteractions;

import com.example.vivuapp.entity.PostAndInteractions.PostPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostPlaceRepository extends JpaRepository<PostPlace, Long> {
}

