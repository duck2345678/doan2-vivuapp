package com.example.vnuguideapp.service.PlaceAndMapping;

import com.example.vnuguideapp.dto.reponse.PlaceAndMapping.PlaceTypeResponse;
import com.example.vnuguideapp.dto.request.PlaceAndMapping.PlaceTypeRequest;
import com.example.vnuguideapp.entity.PlaceAndMapping.PlaceType;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceAlreadyExistsException;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.PlaceAndMapping.PlaceTypeRepository;
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
public class PlaceTypeService {

    PlaceTypeRepository placeTypeRepository;

    public List<PlaceTypeResponse> getAllPlaceTypes() {
        return placeTypeRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public PlaceTypeResponse getPlaceTypeById(Long id) {
        return toResponse(findPlaceTypeOrThrow(id));
    }

    @Transactional
    public PlaceTypeResponse createPlaceType(PlaceTypeRequest request) {
        if (placeTypeRepository.existsByCode(request.getCode())) {
            throw new ResourceAlreadyExistsException("PlaceType with code '" + request.getCode() + "' already exists");
        }

        PlaceType placeType = PlaceType.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .iconType(request.getIconType() != null ? request.getIconType() : "default")
                .build();

        return toResponse(placeTypeRepository.save(placeType));
    }

    @Transactional
    public PlaceTypeResponse updatePlaceType(Long id, PlaceTypeRequest request) {
        PlaceType placeType = findPlaceTypeOrThrow(id);

        if (request.getName() != null) {
            placeType.setName(request.getName());
        }
        if (request.getDescription() != null) {
            placeType.setDescription(request.getDescription());
        }
        if (request.getIconType() != null) {
            placeType.setIconType(request.getIconType());
        }

        return toResponse(placeTypeRepository.save(placeType));
    }

    private PlaceType findPlaceTypeOrThrow(Long id) {
        return placeTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PlaceType not found with id: " + id));
    }

    private PlaceTypeResponse toResponse(PlaceType placeType) {
        return PlaceTypeResponse.builder()
                .id(placeType.getId())
                .code(placeType.getCode())
                .name(placeType.getName())
                .description(placeType.getDescription())
                .iconType(placeType.getIconType())
                .build();
    }
}
