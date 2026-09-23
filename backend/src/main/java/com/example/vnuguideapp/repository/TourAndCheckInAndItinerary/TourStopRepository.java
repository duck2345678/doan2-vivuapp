package com.example.vnuguideapp.repository.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.entity.TourAndCheckInAndItinerary.TourStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TourStopRepository extends JpaRepository<TourStop, Long> {

    List<TourStop> findByTourIdOrderBySequenceOrderAsc(Long tourId);

    Optional<TourStop> findByTourIdAndId(Long tourId, Long stopId);

    @Query("SELECT MAX(ts.sequenceOrder) FROM TourStop ts WHERE ts.tour.id = :tourId")
    Optional<Integer> findMaxSequenceOrder(@Param("tourId") Long tourId);

    @Modifying
    @Query("DELETE FROM TourStop ts WHERE ts.tour.id = :tourId AND ts.id = :stopId")
    void deleteByTourIdAndId(@Param("tourId") Long tourId, @Param("stopId") Long stopId);

    @Modifying
    @Query("DELETE FROM TourStop ts WHERE ts.tour.id = :tourId")
    void deleteByTourId(@Param("tourId") Long tourId);
}
