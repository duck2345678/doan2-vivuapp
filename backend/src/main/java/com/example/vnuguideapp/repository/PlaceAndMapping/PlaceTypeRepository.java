package com.example.vnuguideapp.repository.PlaceAndMapping;

import com.example.vnuguideapp.entity.PlaceAndMapping.PlaceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaceTypeRepository extends JpaRepository<PlaceType, Long> {

    Optional<PlaceType> findByCode(String code);

    boolean existsByCode(String code);

    List<PlaceType> findByNameContainingIgnoreCase(String name);
}
