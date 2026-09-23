package com.example.vivuapp.service.PlaceAndMapping;

import com.example.vivuapp.dto.reponse.PlaceAndMapping.*;
import com.example.vivuapp.dto.request.PlaceAndMapping.PlaceSuggestionRequest;
import com.example.vivuapp.dto.request.PlaceAndMapping.PlaceSuggestionReviewRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.PlaceAndMapping.Place;
import com.example.vivuapp.entity.PlaceAndMapping.PlaceSuggestion;
import com.example.vivuapp.entity.PlaceAndMapping.PlaceType;
import com.example.vivuapp.enums.PlaceStatus;
import com.example.vivuapp.enums.PlaceSuggestionStatus;
import com.example.vivuapp.exception.exceptionImpl.BadRequestException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.Location.DistrictRepository;
import com.example.vivuapp.repository.Location.ProvinceRepository;
import com.example.vivuapp.repository.Location.WardRepository;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceRepository;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceSuggestionRepository;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceTypeRepository;
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
public class PlaceSuggestionService {

    PlaceSuggestionRepository placeSuggestionRepository;
    PlaceTypeRepository placeTypeRepository;
    ProvinceRepository provinceRepository;
    DistrictRepository districtRepository;
    WardRepository wardRepository;
    PlaceRepository placeRepository;

    @Transactional
    public PlaceSuggestionResponse submitSuggestion(User user, PlaceSuggestionRequest request) {
        PlaceSuggestion suggestion = PlaceSuggestion.builder()
                .suggestedBy(user)
                .placeName(request.getPlaceName())
                .addressDetail(request.getAddressDetail())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .description(request.getDescription())
                .status(PlaceSuggestionStatus.PENDING)
                .build();

        if (request.getTypeId() != null) {
            suggestion.setPlaceType(placeTypeRepository.findById(request.getTypeId()).orElse(null));
        }
        if (request.getProvinceId() != null) {
            suggestion.setProvince(provinceRepository.findById(request.getProvinceId()).orElse(null));
        }
        if (request.getDistrictId() != null) {
            suggestion.setDistrict(districtRepository.findById(request.getDistrictId()).orElse(null));
        }
        if (request.getWardId() != null) {
            suggestion.setWard(wardRepository.findById(request.getWardId()).orElse(null));
        }

        return toResponse(placeSuggestionRepository.save(suggestion));
    }

    public Page<PlaceSuggestionResponse> getMySuggestions(User user, PlaceSuggestionStatus status, Pageable pageable) {
        Page<PlaceSuggestion> suggestions = status != null
                ? placeSuggestionRepository.findBySuggestedByIdAndStatus(user.getId(), status, pageable)
                : placeSuggestionRepository.findBySuggestedById(user.getId(), pageable);
        return suggestions.map(this::toResponse);
    }

    public Page<PlaceSuggestionResponse> getAllSuggestions(PlaceSuggestionStatus status, Pageable pageable) {
        Page<PlaceSuggestion> suggestions = status != null
                ? placeSuggestionRepository.findByStatus(status, pageable)
                : placeSuggestionRepository.findAll(pageable);
        return suggestions.map(this::toResponse);
    }

    @Transactional
    public PlaceSuggestionResponse reviewSuggestion(User adminUser, Long id, PlaceSuggestionReviewRequest request) {
        PlaceSuggestion suggestion = findSuggestionOrThrow(id);

        if (suggestion.getStatus() != PlaceSuggestionStatus.PENDING) {
            throw new BadRequestException("This suggestion has already been reviewed");
        }

        suggestion.setStatus(request.getStatus());
        suggestion.setReviewedBy(adminUser);
        suggestion.setReviewedAt(LocalDateTime.now());

        if (request.getStatus() == PlaceSuggestionStatus.REJECTED) {
            suggestion.setRejectionReason(request.getRejectionReason());
        }

        PlaceSuggestion saved = placeSuggestionRepository.save(suggestion);

        // If approved and createPlace is true, create a new Place
        if (request.getStatus() == PlaceSuggestionStatus.APPROVED
                && Boolean.TRUE.equals(request.getCreatePlace())) {
            createPlaceFromSuggestion(suggestion, adminUser);
        }

        return toResponse(saved);
    }

    private void createPlaceFromSuggestion(PlaceSuggestion suggestion, User adminUser) {
        Place place = Place.builder()
                .name(suggestion.getPlaceName())
                .placeType(suggestion.getPlaceType())
                .province(suggestion.getProvince())
                .district(suggestion.getDistrict())
                .ward(suggestion.getWard())
                .addressDetail(suggestion.getAddressDetail())
                .latitude(suggestion.getLatitude())
                .longitude(suggestion.getLongitude())
                .description(suggestion.getDescription())
                .status(PlaceStatus.ACTIVE)
                .isOfficial(false) // User-suggested places are not official
                .createdBy(adminUser)
                .build();

        placeRepository.save(place);
    }

    private PlaceSuggestion findSuggestionOrThrow(Long id) {
        return placeSuggestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Place suggestion not found with id: " + id));
    }

    private PlaceSuggestionResponse toResponse(PlaceSuggestion s) {
        return PlaceSuggestionResponse.builder()
                .id(s.getId())
                .suggestedById(s.getSuggestedBy().getId())
                .suggestedByName(s.getSuggestedBy().getFirstName() + " " + s.getSuggestedBy().getLastName())
                .placeName(s.getPlaceName())
                .placeType(s.getPlaceType() != null ? toPlaceTypeResponse(s.getPlaceType()) : null)
                .province(s.getProvince() != null ? ProvinceResponse.builder()
                        .id(s.getProvince().getId())
                        .name(s.getProvince().getName())
                        .build() : null)
                .district(s.getDistrict() != null ? DistrictResponse.builder()
                        .id(s.getDistrict().getId())
                        .name(s.getDistrict().getName())
                        .provinceId(
                                s.getDistrict().getProvince() != null ? s.getDistrict().getProvince().getId() : null)
                        .build() : null)
                .ward(s.getWard() != null ? WardResponse.builder()
                        .id(s.getWard().getId())
                        .name(s.getWard().getName())
                        .districtId(s.getWard().getDistrict() != null ? s.getWard().getDistrict().getId() : null)
                        .build() : null)
                .addressDetail(s.getAddressDetail())
                .latitude(s.getLatitude())
                .longitude(s.getLongitude())
                .description(s.getDescription())
                .status(s.getStatus())
                .rejectionReason(s.getRejectionReason())
                .reviewedById(s.getReviewedBy() != null ? s.getReviewedBy().getId() : null)
                .reviewedAt(s.getReviewedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private PlaceTypeResponse toPlaceTypeResponse(PlaceType pt) {
        return PlaceTypeResponse.builder()
                .id(pt.getId())
                .code(pt.getCode())
                .name(pt.getName())
                .description(pt.getDescription())
                .build();
    }
}
