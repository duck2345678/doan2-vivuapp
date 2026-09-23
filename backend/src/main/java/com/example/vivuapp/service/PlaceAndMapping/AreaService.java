package com.example.vivuapp.service.PlaceAndMapping;

import com.example.vivuapp.dto.reponse.PlaceAndMapping.AreaResponse;
import com.example.vivuapp.dto.request.PlaceAndMapping.AreaRequest;
import com.example.vivuapp.entity.PlaceAndMapping.Area;
import com.example.vivuapp.exception.exceptionImpl.ResourceAlreadyExistsException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.PlaceAndMapping.AreaRepository;
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
public class AreaService {

    AreaRepository areaRepository;

    public List<AreaResponse> getAllAreas() {
        return areaRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public AreaResponse getAreaById(Long id) {
        return toResponse(findAreaOrThrow(id));
    }

    @Transactional
    public AreaResponse createArea(AreaRequest request) {
        if (areaRepository.existsByCode(request.getCode())) {
            throw new ResourceAlreadyExistsException("Area with code '" + request.getCode() + "' already exists");
        }

        Area area = Area.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .build();

        return toResponse(areaRepository.save(area));
    }

    @Transactional
    public AreaResponse updateArea(Long id, AreaRequest request) {
        Area area = findAreaOrThrow(id);

        if (request.getName() != null) {
            area.setName(request.getName());
        }
        if (request.getDescription() != null) {
            area.setDescription(request.getDescription());
        }

        return toResponse(areaRepository.save(area));
    }

    private Area findAreaOrThrow(Long id) {
        return areaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Area not found with id: " + id));
    }

    private AreaResponse toResponse(Area area) {
        return AreaResponse.builder()
                .id(area.getId())
                .code(area.getCode())
                .name(area.getName())
                .description(area.getDescription())
                .createdAt(area.getCreatedAt())
                .updatedAt(area.getUpdatedAt())
                .build();
    }
}
