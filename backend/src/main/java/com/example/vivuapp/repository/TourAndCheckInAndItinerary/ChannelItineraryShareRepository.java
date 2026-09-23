package com.example.vivuapp.repository.TourAndCheckInAndItinerary;

import com.example.vivuapp.entity.TourAndCheckInAndItinerary.ChannelItineraryShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChannelItineraryShareRepository extends JpaRepository<ChannelItineraryShare, Long> {
}

