package com.example.vnuguideapp.repository.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.entity.TourAndCheckInAndItinerary.ChannelItineraryShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChannelItineraryShareRepository extends JpaRepository<ChannelItineraryShare, Long> {
}

