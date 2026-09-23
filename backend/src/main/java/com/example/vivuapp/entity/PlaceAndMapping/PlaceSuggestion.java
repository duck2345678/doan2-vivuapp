package com.example.vivuapp.entity.PlaceAndMapping;

import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.Location.District;
import com.example.vivuapp.entity.Location.Province;
import com.example.vivuapp.entity.Location.Ward;
import com.example.vivuapp.enums.PlaceSuggestionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "place_suggestions")
@EntityListeners(AuditingEntityListener.class)
public class PlaceSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "suggested_by")
    private User suggestedBy;

    @Column(nullable = false, length = 200)
    private String placeName;

    @ManyToOne
    @JoinColumn(name = "place_type_id")
    private PlaceType placeType;

    @ManyToOne
    @JoinColumn(name = "province_id")
    private Province province;

    @ManyToOne
    @JoinColumn(name = "district_id")
    private District district;

    @ManyToOne
    @JoinColumn(name = "ward_id")
    private Ward ward;

    private String addressDetail;

    // Vĩ độ
    private Double latitude;
    // Kinh độ
    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PlaceSuggestionStatus status;

    private String rejectionReason;

    @ManyToOne
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    private LocalDateTime reviewedAt;

    @CreationTimestamp
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;
}

