package com.example.vivuapp.repository.ReportAndSystemSetting;

import com.example.vivuapp.entity.ReportAndSystemSetting.ReportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReportTypeRepository extends JpaRepository<ReportType, Long> {
  boolean existsByCode(String code);

  Optional<ReportType> findByCode(String code);

  List<ReportType> findByNameContainingIgnoreCase(String search);
}
