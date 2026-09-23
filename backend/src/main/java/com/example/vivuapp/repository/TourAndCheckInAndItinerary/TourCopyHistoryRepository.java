package com.example.vivuapp.repository.TourAndCheckInAndItinerary;

import com.example.vivuapp.entity.TourAndCheckInAndItinerary.TourCopyHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TourCopyHistoryRepository extends JpaRepository<TourCopyHistory, Long> {
}

