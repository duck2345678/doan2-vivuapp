package com.example.vnuguideapp.repository.Location;

import com.example.vnuguideapp.entity.Location.District;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DistrictRepository extends JpaRepository<District, Long> {

    List<District> findByProvinceId(Long provinceId);
}
