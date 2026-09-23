package com.example.vivuapp.service.TourAndCheckInAndItinerary;

import com.example.vivuapp.dto.reponse.TourAndCheckInAndItinerary.TourStopResponse;
import com.example.vivuapp.dto.request.TourAndCheckInAndItinerary.TourStopRequest;
import com.example.vivuapp.dto.request.TourAndCheckInAndItinerary.TourStopReorderRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.PlaceAndMapping.Place;
import com.example.vivuapp.entity.TourAndCheckInAndItinerary.Tour;
import com.example.vivuapp.entity.TourAndCheckInAndItinerary.TourStop;
import com.example.vivuapp.exception.exceptionImpl.ForbiddenException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceRepository;
import com.example.vivuapp.repository.TourAndCheckInAndItinerary.TourRepository;
import com.example.vivuapp.repository.TourAndCheckInAndItinerary.TourStopRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TourStopService {

    TourRepository tourRepository;
    TourStopRepository tourStopRepository;
    PlaceRepository placeRepository;

    public List<TourStopResponse> getStops(User user, Long tourId) {
        Tour tour = findTourOrThrow(tourId);

        // Check permission: owner or shared tour
        if (!tour.getUser().getId().equals(user.getId()) && !tour.getSharedAsPost()) {
            throw new ForbiddenException("You don't have permission to view this tour's stops");
        }

        return tourStopRepository.findByTourIdOrderBySequenceOrderAsc(tourId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TourStopResponse addStop(User user, Long tourId, TourStopRequest request) {
        Tour tour = findTourOrThrow(tourId);
        validateOwnership(user, tour);

        Place place = placeRepository.findById(request.getPlaceId())
                .orElseThrow(() -> new ResourceNotFoundException("Place not found"));

        // Determine sequence order
        Integer sequenceOrder = request.getSequenceOrder();
        if (sequenceOrder == null) {
            sequenceOrder = tourStopRepository.findMaxSequenceOrder(tourId).orElse(0) + 1;
        }

        TourStop stop = TourStop.builder()
                .tour(tour)
                .place(place)
                .sequenceOrder(sequenceOrder)
                .note(request.getNote())
                .build();

        return toResponse(tourStopRepository.save(stop));
    }

    @Transactional
    public List<TourStopResponse> reorderStops(User user, Long tourId, TourStopReorderRequest request) {
        Tour tour = findTourOrThrow(tourId);
        validateOwnership(user, tour);

        for (TourStopReorderRequest.StopOrderItem item : request.getStops()) {
            TourStop stop = tourStopRepository.findByTourIdAndId(tourId, item.getStopId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tour stop not found: " + item.getStopId()));
            stop.setSequenceOrder(item.getSequenceOrder());
            tourStopRepository.save(stop);
        }

        return tourStopRepository.findByTourIdOrderBySequenceOrderAsc(tourId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeStop(User user, Long tourId, Long stopId) {
        Tour tour = findTourOrThrow(tourId);
        validateOwnership(user, tour);

        TourStop stop = tourStopRepository.findByTourIdAndId(tourId, stopId)
                .orElseThrow(() -> new ResourceNotFoundException("Tour stop not found"));

        tourStopRepository.delete(stop);
    }

    private Tour findTourOrThrow(Long id) {
        return tourRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found with id: " + id));
    }

    private void validateOwnership(User user, Tour tour) {
        if (!tour.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only modify your own tour's stops");
        }
    }

    private TourStopResponse toResponse(TourStop stop) {
        return TourStopResponse.builder()
                .id(stop.getId())
                .tourId(stop.getTour().getId())
                .placeId(stop.getPlace().getId())
                .placeName(stop.getPlace().getName())
                .sequenceOrder(stop.getSequenceOrder())
                .note(stop.getNote())
                .build();
    }
}
