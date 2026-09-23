package com.example.vnuguideapp.repository.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.entity.TourAndCheckInAndItinerary.TourCopyHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TourCopyHistoryRepository extends JpaRepository<TourCopyHistory, Long> {
}

