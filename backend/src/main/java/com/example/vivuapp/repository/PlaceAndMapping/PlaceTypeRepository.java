package com.example.vivuapp.repository.PlaceAndMapping;

import com.example.vivuapp.entity.PlaceAndMapping.PlaceType;
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
