package com.example.vnuguideapp.repository.PlaceAndMapping;

import com.example.vnuguideapp.entity.PlaceAndMapping.Area;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AreaRepository extends JpaRepository<Area, Long> {

    Optional<Area> findByCode(String code);

    boolean existsByCode(String code);
}
