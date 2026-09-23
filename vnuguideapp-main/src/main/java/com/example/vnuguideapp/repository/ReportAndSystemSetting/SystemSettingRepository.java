package com.example.vnuguideapp.repository.ReportAndSystemSetting;

import com.example.vnuguideapp.entity.ReportAndSystemSetting.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
}

