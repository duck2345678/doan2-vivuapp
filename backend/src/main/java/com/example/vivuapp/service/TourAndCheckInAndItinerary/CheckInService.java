package com.example.vivuapp.service.TourAndCheckInAndItinerary;

import com.example.vivuapp.dto.reponse.TourAndCheckInAndItinerary.CheckInResponse;
import com.example.vivuapp.dto.request.TourAndCheckInAndItinerary.CheckInRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.PlaceAndMapping.Place;
import com.example.vivuapp.entity.TourAndCheckInAndItinerary.CheckIn;
import com.example.vivuapp.entity.TourAndCheckInAndItinerary.Tour;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceRepository;
import com.example.vivuapp.repository.TourAndCheckInAndItinerary.CheckInRepository;
import com.example.vivuapp.repository.TourAndCheckInAndItinerary.TourRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CheckInService {

    CheckInRepository checkInRepository;
    PlaceRepository placeRepository;
    TourRepository tourRepository;

    @Transactional
    public CheckInResponse checkIn(User user, CheckInRequest request) {
        Place place = placeRepository.findById(request.getPlaceId())
                .orElseThrow(() -> new ResourceNotFoundException("Place not found"));

        // Determine which tour to attach the check-in to
        Tour tour = null;
        if (request.getTourId() != null) {
            tour = tourRepository.findById(request.getTourId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tour not found"));
        } else {
            // Try to find current ongoing tour
            tour = tourRepository.findCurrentOngoingTour(user.getId()).orElse(null);
        }

        CheckIn checkIn = CheckIn.builder()
                .user(user)
                .place(place)
                .tour(tour)
                .checkedInAt(request.getCheckedInAt() != null ? request.getCheckedInAt() : LocalDateTime.now())
                .note(request.getNote())
                .build();

        return toResponse(checkInRepository.save(checkIn));
    }

    public Page<CheckInResponse> getMyCheckIns(
            User user,
            Long placeId,
            Long tourId,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable) {
        Page<CheckIn> checkIns = checkInRepository.findByUserIdWithFilters(
                user.getId(), placeId, tourId, from, to, pageable);
        return checkIns.map(this::toResponse);
    }

    private CheckInResponse toResponse(CheckIn checkIn) {
        return CheckInResponse.builder()
                .id(checkIn.getId())
                .userId(checkIn.getUser().getId())
                .tourId(checkIn.getTour() != null ? checkIn.getTour().getId() : null)
                .placeId(checkIn.getPlace().getId())
                .placeName(checkIn.getPlace().getName())
                .checkedInAt(checkIn.getCheckedInAt())
                .note(checkIn.getNote())
                .build();
    }
}
