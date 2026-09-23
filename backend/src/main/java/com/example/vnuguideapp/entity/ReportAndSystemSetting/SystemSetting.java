package com.example.vnuguideapp.entity.ReportAndSystemSetting;

import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "system_settings")
public class SystemSetting {

    @Id
    @Column(name = "`key`", length = 100)
    private String key;

    @Column(nullable = false, length = 255)
    private String value;

    private String description;

    private LocalDateTime updatedAt;

    @ManyToOne
    private User updatedBy;
}

