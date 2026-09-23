package com.example.vivuapp.repository.TourAndCheckInAndItinerary;

import com.example.vivuapp.entity.TourAndCheckInAndItinerary.CheckIn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface CheckInRepository extends JpaRepository<CheckIn, Long> {

    Page<CheckIn> findByUserId(Long userId, Pageable pageable);

    @Query("""
            SELECT c FROM CheckIn c
            WHERE c.user.id = :userId
            AND (:placeId IS NULL OR c.place.id = :placeId)
            AND (:tourId IS NULL OR c.tour.id = :tourId)
            AND (:from IS NULL OR c.checkedInAt >= :from)
            AND (:to IS NULL OR c.checkedInAt <= :to)
            ORDER BY c.checkedInAt DESC
            """)
    Page<CheckIn> findByUserIdWithFilters(
            @Param("userId") Long userId,
            @Param("placeId") Long placeId,
            @Param("tourId") Long tourId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);
}
