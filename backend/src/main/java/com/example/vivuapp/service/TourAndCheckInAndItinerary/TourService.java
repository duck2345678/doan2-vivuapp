package com.example.vivuapp.service.TourAndCheckInAndItinerary;

import com.example.vivuapp.dto.reponse.PlaceAndMapping.PlaceResponse;
import com.example.vivuapp.dto.reponse.TourAndCheckInAndItinerary.TourResponse;
import com.example.vivuapp.dto.reponse.TourAndCheckInAndItinerary.TourStopResponse;
import com.example.vivuapp.dto.request.TourAndCheckInAndItinerary.TourRequest;
import com.example.vivuapp.dto.request.TourAndCheckInAndItinerary.TourShareRequest;
import com.example.vivuapp.dto.request.TourAndCheckInAndItinerary.TourStopWithGooglePlaceRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.PlaceAndMapping.Place;
import com.example.vivuapp.entity.PlaceAndMapping.PlaceType;
import com.example.vivuapp.entity.TourAndCheckInAndItinerary.Tour;
import com.example.vivuapp.entity.TourAndCheckInAndItinerary.TourStop;
import com.example.vivuapp.entity.PostAndInteractions.Post;
import com.example.vivuapp.enums.PlaceStatus;
import com.example.vivuapp.enums.PostType;
import com.example.vivuapp.enums.TourStatus;
import com.example.vivuapp.enums.Visibility;
import com.example.vivuapp.exception.exceptionImpl.BadRequestException;
import com.example.vivuapp.exception.exceptionImpl.ForbiddenException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.TourAndCheckInAndItinerary.TourRepository;
import com.example.vivuapp.repository.TourAndCheckInAndItinerary.TourStopRepository;
import com.example.vivuapp.repository.PostAndInteractions.PostRepository;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceRepository;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceTypeRepository;
import com.example.vivuapp.service.Google.GoogleMapsService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TourService {

    TourRepository tourRepository;
    TourStopRepository tourStopRepository;
    PostRepository postRepository;
    GoogleMapsService googleMapsService;
    PlaceRepository placeRepository;
    PlaceTypeRepository placeTypeRepository;

    public Page<TourResponse> getMyTours(User user, TourStatus status, Pageable pageable) {
        Page<Tour> tours = status != null
                ? tourRepository.findByUserIdAndStatus(user.getId(), status, pageable)
                : tourRepository.findByUserId(user.getId(), pageable);
        return tours.map(this::toResponse);
    }

    public Optional<TourResponse> getCurrentTour(User user) {
        return tourRepository.findCurrentOngoingTour(user.getId())
                .map(this::toResponseWithStops);
    }

    public TourResponse getTourById(User user, Long tourId) {
        Tour tour = findTourOrThrow(tourId);

        // Check if user can view this tour (owner or tour is shared)
        if (!tour.getUser().getId().equals(user.getId()) && !tour.getSharedAsPost()) {
            throw new ForbiddenException("You don't have permission to view this tour");
        }

        return toResponseWithStops(tour);
    }

    @Transactional
    public TourResponse createTour(User user, TourRequest request) {
        Tour tour = Tour.builder()
                .user(user)
                .name(request.getName())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .startTime(request.getStartTime() != null ? request.getStartTime() : LocalDateTime.now())
                .status(TourStatus.SCHEDULED)
                .sharedAsPost(false)
                .build();

        Tour savedTour = tourRepository.save(tour);

        // Add stops if provided (using database Place IDs)
        if (request.getStops() != null && !request.getStops().isEmpty()) {
            int order = 1;
            for (var stopRequest : request.getStops()) {
                var place = placeRepository.findById(stopRequest.getPlaceId())
                        .orElseThrow(() -> new ResourceNotFoundException("Place not found with id: " + stopRequest.getPlaceId()));

                TourStop stop = TourStop.builder()
                        .tour(savedTour)
                        .place(place)
                        .sequenceOrder(stopRequest.getSequenceOrder() != null ? stopRequest.getSequenceOrder() : order)
                        .note(stopRequest.getNote())
                        .build();
                tourStopRepository.save(stop);
                order++;
            }
        }

        // Add stops from Google Places (find or create Place by googlePlaceId)
        if (request.getGooglePlaceStops() != null && !request.getGooglePlaceStops().isEmpty()) {
            int order = tourStopRepository.findMaxSequenceOrder(savedTour.getId()).orElse(0) + 1;
            for (var googleStop : request.getGooglePlaceStops()) {
                Place place = findOrCreatePlaceFromGoogle(googleStop, user);

                TourStop stop = TourStop.builder()
                        .tour(savedTour)
                        .place(place)
                        .sequenceOrder(googleStop.getSequenceOrder() != null ? googleStop.getSequenceOrder() : order)
                        .note(googleStop.getNote())
                        .build();
                tourStopRepository.save(stop);
                order++;
            }
        }

        return toResponseWithStops(savedTour);
    }

    /**
     * Find existing Place by Google Place ID or create a new one
     */
    private Place findOrCreatePlaceFromGoogle(TourStopWithGooglePlaceRequest googleStop, User user) {
        // Try to find existing place by Google Place ID
        Optional<Place> existingPlace = placeRepository.findByGooglePlaceId(googleStop.getGooglePlaceId());
        if (existingPlace.isPresent()) {
            return existingPlace.get();
        }

        // Create new place from Google data
        // Get default place type (OTHER) or create it if not exists
        var defaultPlaceType = placeTypeRepository.findByCode("OTHER")
                .orElseGet(() -> {
                    PlaceType newPlaceType = PlaceType.builder()
                            .code("OTHER")
                            .name("Khác")
                            .description("Địa điểm khác không thuộc danh mục cụ thể")
                            .iconType("other")
                            .build();
                    return placeTypeRepository.save(newPlaceType);
                });

        Place newPlace = Place.builder()
                .googlePlaceId(googleStop.getGooglePlaceId())
                .name(googleStop.getPlaceName())
                .addressDetail(googleStop.getAddress())
                .latitude(googleStop.getLatitude())
                .longitude(googleStop.getLongitude())
                .imageUrl(googleStop.getImageUrl())
                .placeType(defaultPlaceType)
                .status(PlaceStatus.ACTIVE)
                .isOfficial(false)
                .createdBy(user)
                .build();

        return placeRepository.save(newPlace);
    }

    @Transactional
    public TourResponse updateTour(User user, Long tourId, TourRequest request) {
        Tour tour = findTourOrThrow(tourId);
        validateOwnership(user, tour);

        if (request.getName() != null && !request.getName().isBlank()) {
            tour.setName(request.getName());
        }
        if (request.getDescription() != null) {
            tour.setDescription(request.getDescription());
        }
        if (request.getStartDate() != null) {
            tour.setStartDate(request.getStartDate());
        }
        if (request.getStartTime() != null) {
            tour.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            tour.setEndTime(request.getEndTime());
        }

        Tour savedTour = tourRepository.save(tour);

        // Update stops if provided - replace all existing stops
        if (request.getGooglePlaceStops() != null && !request.getGooglePlaceStops().isEmpty()) {
            // Delete existing stops
            tourStopRepository.deleteByTourId(tourId);

            // Add new stops from Google Places
            int order = 1;
            for (var googleStop : request.getGooglePlaceStops()) {
                Place place = findOrCreatePlaceFromGoogle(googleStop, user);

                TourStop stop = TourStop.builder()
                        .tour(savedTour)
                        .place(place)
                        .sequenceOrder(googleStop.getSequenceOrder() != null ? googleStop.getSequenceOrder() : order)
                        .note(googleStop.getNote())
                        .build();
                tourStopRepository.save(stop);
                order++;
            }
        }

        return toResponseWithStops(savedTour);
    }

    @Transactional
    public TourResponse completeTour(User user, Long tourId) {
        Tour tour = findTourOrThrow(tourId);
        validateOwnership(user, tour);

        if (tour.getStatus() == TourStatus.COMPLETED || tour.getStatus() == TourStatus.CANCELLED) {
            throw new BadRequestException("Cannot complete a tour that is already " + tour.getStatus().name());
        }

        tour.setStatus(TourStatus.COMPLETED);
        tour.setEndTime(LocalDateTime.now());

        return toResponseWithStops(tourRepository.save(tour));
    }

    @Transactional
    public TourResponse startTour(User user, Long tourId) {
        Tour tour = findTourOrThrow(tourId);
        validateOwnership(user, tour);

        if (tour.getStatus() != TourStatus.SCHEDULED) {
            throw new BadRequestException("Can only start a scheduled tour. Current status: " + tour.getStatus().name());
        }

        tour.setStatus(TourStatus.ONGOING);
        tour.setStartTime(LocalDateTime.now());

        return toResponseWithStops(tourRepository.save(tour));
    }

    @Transactional
    public TourResponse cancelTour(User user, Long tourId) {
        Tour tour = findTourOrThrow(tourId);
        validateOwnership(user, tour);

        if (tour.getStatus() == TourStatus.COMPLETED || tour.getStatus() == TourStatus.CANCELLED) {
            throw new BadRequestException("Cannot cancel a tour that is already " + tour.getStatus().name());
        }

        tour.setStatus(TourStatus.CANCELLED);

        return toResponse(tourRepository.save(tour));
    }

    @Transactional
    public TourResponse shareAsPost(User user, Long tourId, TourShareRequest request) {
        Tour tour = findTourOrThrow(tourId);
        validateOwnership(user, tour);

        if (tour.getSharedAsPost()) {
            throw new BadRequestException("This tour is already shared as a post");
        }

        // Fetch tour stops for static map generation
        List<TourStop> stops = tourStopRepository.findByTourIdOrderBySequenceOrderAsc(tourId);

        // Generate static map URL if stops exist
        String staticMapUrl = null;
        if (!stops.isEmpty() && googleMapsService != null) {
            staticMapUrl = googleMapsService.buildStaticMapUrl(stops);
        }

        // Create a post linked to this tour
        Post post = Post.builder()
                .user(user)
                .postType(PostType.TOUR)
                .content(request.getPostTitle())
                .tour(tour)
                .visibility(request.getVisibility() != null ? request.getVisibility() : Visibility.PUBLIC)
                .build();

        // Set static map URL if available (requires Post entity update)
        // post.setStaticMapUrl(staticMapUrl);

        postRepository.save(post);

        // Mark tour as shared
        tour.setSharedAsPost(true);

        TourResponse response = toResponseWithStops(tourRepository.save(tour));
        response.setStaticMapUrl(staticMapUrl);
        return response;
    }

    @Transactional
    public TourResponse copyTour(User user, Long tourId) {
        Tour originalTour = findTourOrThrow(tourId);

        // Only shared tours can be copied
        if (!originalTour.getSharedAsPost()) {
            throw new ForbiddenException("Only shared tours can be copied");
        }

        // Create a copy
        Tour copiedTour = Tour.builder()
                .user(user)
                .name(originalTour.getName() + " (Copy)")
                .description(originalTour.getDescription())
                .startDate(originalTour.getStartDate())
                .startTime(originalTour.getStartTime())
                .status(TourStatus.SCHEDULED)
                .sharedAsPost(false)
                .originalTour(originalTour)
                .build();

        Tour savedTour = tourRepository.save(copiedTour);

        // Copy all stops
        List<TourStop> originalStops = tourStopRepository.findByTourIdOrderBySequenceOrderAsc(tourId);
        for (TourStop originalStop : originalStops) {
            TourStop newStop = TourStop.builder()
                    .tour(savedTour)
                    .place(originalStop.getPlace())
                    .sequenceOrder(originalStop.getSequenceOrder())
                    .note(originalStop.getNote())
                    .build();
            tourStopRepository.save(newStop);
        }

        return toResponseWithStops(savedTour);
    }

    private Tour findTourOrThrow(Long id) {
        return tourRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found with id: " + id));
    }

    private void validateOwnership(User user, Tour tour) {
        if (!tour.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only modify your own tours");
        }
    }

    private TourResponse toResponse(Tour tour) {
        return TourResponse.builder()
                .id(tour.getId())
                .userId(tour.getUser().getId())
                .userName(tour.getUser().getFirstName() + " " + tour.getUser().getLastName())
                .name(tour.getName())
                .description(tour.getDescription())
                .startDate(tour.getStartDate())
                .startTime(tour.getStartTime())
                .endTime(tour.getEndTime())
                .status(tour.getStatus())
                .sharedAsPost(tour.getSharedAsPost())
                .originalTourId(tour.getOriginalTour() != null ? tour.getOriginalTour().getId() : null)
                .createdAt(tour.getCreatedAt())
                .updatedAt(tour.getUpdatedAt())
                .build();
    }

    private TourResponse toResponseWithStops(Tour tour) {
        List<TourStop> stops = tourStopRepository.findByTourIdOrderBySequenceOrderAsc(tour.getId());

        TourResponse response = toResponse(tour);
        response.setStops(stops.stream()
                .map(this::toStopResponse)
                .collect(Collectors.toList()));
        return response;
    }

    private TourStopResponse toStopResponse(TourStop stop) {
        Place place = stop.getPlace();
        
        return TourStopResponse.builder()
                .id(stop.getId())
                .tourId(stop.getTour().getId())
                .placeId(place.getId())
                .placeName(place.getName())
                .sequenceOrder(stop.getSequenceOrder())
                .note(stop.getNote())
                .place(toPlaceResponse(place))
                .build();
    }

    private PlaceResponse toPlaceResponse(Place place) {
        return PlaceResponse.builder()
                .id(place.getId())
                .googlePlaceId(place.getGooglePlaceId())
                .name(place.getName())
                .imageUrl(place.getImageUrl())
                .addressDetail(place.getAddressDetail())
                .latitude(place.getLatitude())
                .longitude(place.getLongitude())
                .description(place.getDescription())
                .status(place.getStatus())
                .isOfficial(place.getIsOfficial())
                .build();
    }
}
