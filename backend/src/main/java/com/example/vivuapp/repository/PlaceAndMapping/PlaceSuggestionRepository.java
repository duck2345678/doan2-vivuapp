package com.example.vivuapp.repository.PlaceAndMapping;

import com.example.vivuapp.entity.PlaceAndMapping.PlaceSuggestion;
import com.example.vivuapp.enums.PlaceSuggestionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlaceSuggestionRepository extends JpaRepository<PlaceSuggestion, Long> {

    Page<PlaceSuggestion> findBySuggestedById(Long userId, Pageable pageable);

    Page<PlaceSuggestion> findBySuggestedByIdAndStatus(Long userId, PlaceSuggestionStatus status, Pageable pageable);

    Page<PlaceSuggestion> findByStatus(PlaceSuggestionStatus status, Pageable pageable);
}
