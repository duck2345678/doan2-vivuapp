package com.example.vnuguideapp.repository.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.entity.TourAndCheckInAndItinerary.Tour;
import com.example.vnuguideapp.enums.TourStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TourRepository extends JpaRepository<Tour, Long> {

    Page<Tour> findByUserId(Long userId, Pageable pageable);

    Page<Tour> findByUserIdAndStatus(Long userId, TourStatus status, Pageable pageable);

    @Query("SELECT t FROM Tour t WHERE t.user.id = :userId AND t.status = 'ONGOING' ORDER BY t.createdAt DESC")
    Optional<Tour> findCurrentOngoingTour(@Param("userId") Long userId);

    @Query("SELECT t FROM Tour t WHERE t.sharedAsPost = true ORDER BY t.createdAt DESC")
    Page<Tour> findSharedTours(Pageable pageable);
}
