package com.example.vivuapp.repository.ReportAndSystemSetting;

import com.example.vivuapp.entity.ReportAndSystemSetting.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
}

