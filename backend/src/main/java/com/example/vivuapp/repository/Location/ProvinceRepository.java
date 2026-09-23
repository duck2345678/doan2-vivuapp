package com.example.vivuapp.repository.Location;

import com.example.vivuapp.entity.Location.Province;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProvinceRepository extends JpaRepository<Province, Long> {
}

