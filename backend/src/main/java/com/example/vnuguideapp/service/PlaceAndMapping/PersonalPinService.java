package com.example.vnuguideapp.service.PlaceAndMapping;

import com.example.vnuguideapp.dto.reponse.PlaceAndMapping.PersonalPinResponse;
import com.example.vnuguideapp.dto.request.PlaceAndMapping.PersonalPinRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.PlaceAndMapping.PersonalPin;
import com.example.vnuguideapp.exception.exceptionImpl.ForbiddenException;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.PlaceAndMapping.PersonalPinRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PersonalPinService {

    PersonalPinRepository personalPinRepository;

    public Page<PersonalPinResponse> getMyPins(User user, Pageable pageable) {
        return personalPinRepository.findByUserId(user.getId(), pageable)
                .map(this::toResponse);
    }

    @Transactional
    public PersonalPinResponse createPin(User user, PersonalPinRequest request) {
        PersonalPin pin = PersonalPin.builder()
                .user(user)
                .name(request.getName())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .note(request.getNote())
                .build();

        return toResponse(personalPinRepository.save(pin));
    }

    @Transactional
    public PersonalPinResponse updatePin(User user, Long pinId, PersonalPinRequest request) {
        PersonalPin pin = findPinOrThrow(pinId);

        // Check ownership
        if (!pin.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only update your own pins");
        }

        if (request.getName() != null) {
            pin.setName(request.getName());
        }
        if (request.getLatitude() != null) {
            pin.setLatitude(request.getLatitude());
        }
        if (request.getLongitude() != null) {
            pin.setLongitude(request.getLongitude());
        }
        if (request.getNote() != null) {
            pin.setNote(request.getNote());
        }

        return toResponse(personalPinRepository.save(pin));
    }

    @Transactional
    public void deletePin(User user, Long pinId) {
        PersonalPin pin = findPinOrThrow(pinId);

        // Check ownership
        if (!pin.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only delete your own pins");
        }

        personalPinRepository.delete(pin);
    }

    private PersonalPin findPinOrThrow(Long id) {
        return personalPinRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Personal pin not found with id: " + id));
    }

    private PersonalPinResponse toResponse(PersonalPin pin) {
        return PersonalPinResponse.builder()
                .id(pin.getId())
                .name(pin.getName())
                .latitude(pin.getLatitude())
                .longitude(pin.getLongitude())
                .note(pin.getNote())
                .createdAt(pin.getCreatedAt())
                .updatedAt(pin.getUpdatedAt())
                .build();
    }
}
