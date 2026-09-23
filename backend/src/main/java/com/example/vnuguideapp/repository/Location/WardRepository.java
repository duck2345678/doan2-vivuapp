package com.example.vnuguideapp.repository.Location;

import com.example.vnuguideapp.entity.Location.Ward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WardRepository extends JpaRepository<Ward, Long> {

    List<Ward> findByDistrictId(Long districtId);
}
