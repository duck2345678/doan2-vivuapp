package com.example.vivuapp.entity.PlaceAndMapping;

import com.example.vivuapp.entity.Location.District;
import com.example.vivuapp.entity.Location.Province;
import com.example.vivuapp.entity.Location.Ward;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.enums.PlaceStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "places")
@EntityListeners(AuditingEntityListener.class)
public class Place {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Google Place ID for places synced from Google Maps
     */
    @Column(unique = true, length = 255)
    private String googlePlaceId;

    @Column(nullable = false, length = 200)
    private String name;

    /**
     * Image URL (from Google or uploaded)
     */
    @Column(length = 500)
    private String imageUrl;

    @ManyToOne(optional = false)
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

    private Double latitude;
    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PlaceStatus status;

    @Column(nullable = false)
    private Boolean isOfficial;

    @ManyToOne
    @JoinColumn(name = "owner_user_id")
    private User ownerUser;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreatedDate
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(insertable = false)
    private LocalDateTime updatedAt;

}

