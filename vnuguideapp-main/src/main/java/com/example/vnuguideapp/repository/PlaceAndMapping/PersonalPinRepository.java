package com.example.vnuguideapp.repository.PlaceAndMapping;

import com.example.vnuguideapp.entity.PlaceAndMapping.PersonalPin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonalPinRepository extends JpaRepository<PersonalPin, Long> {

    Page<PersonalPin> findByUserId(Long userId, Pageable pageable);
}
