package com.example.vivuapp.service.PlaceAndMapping;

import com.example.vivuapp.dto.reponse.PlaceAndMapping.*;
import com.example.vivuapp.dto.request.PlaceAndMapping.PlaceRequest;
import com.example.vivuapp.dto.request.PlaceAndMapping.PlaceStatusRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.Location.District;
import com.example.vivuapp.entity.Location.Province;
import com.example.vivuapp.entity.Location.Ward;
import com.example.vivuapp.entity.PlaceAndMapping.Place;
import com.example.vivuapp.entity.PlaceAndMapping.PlaceType;
import com.example.vivuapp.enums.PlaceStatus;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.Location.DistrictRepository;
import com.example.vivuapp.repository.Location.ProvinceRepository;
import com.example.vivuapp.repository.Location.WardRepository;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceRepository;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceTypeRepository;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PlaceService {

    PlaceRepository placeRepository;
    PlaceTypeRepository placeTypeRepository;
    ProvinceRepository provinceRepository;
    DistrictRepository districtRepository;
    WardRepository wardRepository;
    UserRepository userRepository;

    public Page<PlaceResponse> searchPlaces(
            String keyword,
            Long typeId,
            Long provinceId,
            Long districtId,
            Long wardId,
            PlaceStatus status,
            Pageable pageable) {
        Page<Place> places = placeRepository.searchPlaces(
                keyword, typeId, provinceId, districtId, wardId, status, pageable);
        return places.map(this::toResponse);
    }

    public List<PlaceResponse> searchPlacesWithinRadius(
            String keyword,
            Long typeId,
            PlaceStatus status,
            Double latitude,
            Double longitude,
            Double radiusKm) {
        String statusStr = status != null ? status.name() : null;
        List<Place> places = placeRepository.searchPlacesWithinRadius(
                keyword, typeId, statusStr, latitude, longitude, radiusKm);
        return places.stream().map(this::toResponse).toList();
    }

    public PlaceResponse getPlaceById(Long id) {
        return toResponse(findPlaceOrThrow(id));
    }

    @Transactional
    public PlaceResponse createPlace(PlaceRequest request, User adminUser) {
        PlaceType placeType = placeTypeRepository.findById(request.getTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("PlaceType not found"));

        Place place = Place.builder()
                .name(request.getName())
                .placeType(placeType)
                .addressDetail(request.getAddressDetail())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : PlaceStatus.ACTIVE)
                .isOfficial(request.getIsOfficial() != null ? request.getIsOfficial() : true)
                .createdBy(adminUser)
                .build();

        // Set location references
        if (request.getProvinceId() != null) {
            place.setProvince(provinceRepository.findById(request.getProvinceId()).orElse(null));
        }
        if (request.getDistrictId() != null) {
            place.setDistrict(districtRepository.findById(request.getDistrictId()).orElse(null));
        }
        if (request.getWardId() != null) {
            place.setWard(wardRepository.findById(request.getWardId()).orElse(null));
        }
        if (request.getOwnerUserId() != null) {
            place.setOwnerUser(userRepository.findById(request.getOwnerUserId()).orElse(null));
        }

        return toResponse(placeRepository.save(place));
    }

    @Transactional
    public PlaceResponse updatePlace(Long id, PlaceRequest request) {
        Place place = findPlaceOrThrow(id);

        if (request.getName() != null) {
            place.setName(request.getName());
        }
        if (request.getTypeId() != null) {
            PlaceType placeType = placeTypeRepository.findById(request.getTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("PlaceType not found"));
            place.setPlaceType(placeType);
        }
        if (request.getAddressDetail() != null) {
            place.setAddressDetail(request.getAddressDetail());
        }
        if (request.getLatitude() != null) {
            place.setLatitude(request.getLatitude());
        }
        if (request.getLongitude() != null) {
            place.setLongitude(request.getLongitude());
        }
        if (request.getDescription() != null) {
            place.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            place.setStatus(request.getStatus());
        }
        if (request.getProvinceId() != null) {
            place.setProvince(provinceRepository.findById(request.getProvinceId()).orElse(null));
        }
        if (request.getDistrictId() != null) {
            place.setDistrict(districtRepository.findById(request.getDistrictId()).orElse(null));
        }
        if (request.getWardId() != null) {
            place.setWard(wardRepository.findById(request.getWardId()).orElse(null));
        }

        return toResponse(placeRepository.save(place));
    }

    @Transactional
    public PlaceResponse updatePlaceStatus(Long id, PlaceStatusRequest request) {
        Place place = findPlaceOrThrow(id);
        place.setStatus(request.getStatus());
        return toResponse(placeRepository.save(place));
    }

    private Place findPlaceOrThrow(Long id) {
        return placeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Place not found with id: " + id));
    }

    private PlaceResponse toResponse(Place place) {
        return PlaceResponse.builder()
                .id(place.getId())
                .name(place.getName())
                .placeType(toPlaceTypeResponse(place.getPlaceType()))
                .province(place.getProvince() != null ? toProvinceResponse(place.getProvince()) : null)
                .district(place.getDistrict() != null ? toDistrictResponse(place.getDistrict()) : null)
                .ward(place.getWard() != null ? toWardResponse(place.getWard()) : null)
                .addressDetail(place.getAddressDetail())
                .latitude(place.getLatitude())
                .longitude(place.getLongitude())
                .description(place.getDescription())
                .status(place.getStatus())
                .isOfficial(place.getIsOfficial())
                .ownerUserId(place.getOwnerUser() != null ? place.getOwnerUser().getId() : null)
                .createdAt(place.getCreatedAt())
                .updatedAt(place.getUpdatedAt())
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

    private ProvinceResponse toProvinceResponse(Province p) {
        return ProvinceResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .build();
    }

    private DistrictResponse toDistrictResponse(District d) {
        return DistrictResponse.builder()
                .id(d.getId())
                .name(d.getName())
                .provinceId(d.getProvince() != null ? d.getProvince().getId() : null)
                .build();
    }

    private WardResponse toWardResponse(Ward w) {
        return WardResponse.builder()
                .id(w.getId())
                .name(w.getName())
                .districtId(w.getDistrict() != null ? w.getDistrict().getId() : null)
                .build();
    }
}
