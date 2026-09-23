package com.example.vivuapp.repository.PlaceAndMapping;

import com.example.vivuapp.entity.PlaceAndMapping.Place;
import com.example.vivuapp.enums.PlaceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlaceRepository extends JpaRepository<Place, Long> {

    /**
     * Search places with multiple filters
     */
    @Query("""
            SELECT p FROM Place p
            WHERE (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:typeId IS NULL OR p.placeType.id = :typeId)
            AND (:provinceId IS NULL OR p.province.id = :provinceId)
            AND (:districtId IS NULL OR p.district.id = :districtId)
            AND (:wardId IS NULL OR p.ward.id = :wardId)
            AND (:status IS NULL OR p.status = :status)
            """)
    Page<Place> searchPlaces(
            @Param("keyword") String keyword,
            @Param("typeId") Long typeId,
            @Param("provinceId") Long provinceId,
            @Param("districtId") Long districtId,
            @Param("wardId") Long wardId,
            @Param("status") PlaceStatus status,
            Pageable pageable);

    /**
     * Search places within radius (in kilometers) using Haversine formula
     */
    @Query(value = """
            SELECT p.* FROM places p
            WHERE (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:typeId IS NULL OR p.place_type_id = :typeId)
            AND (:status IS NULL OR p.status = CAST(:status AS VARCHAR))
            AND (6371 * acos(cos(radians(:lat)) * cos(radians(p.latitude))
                 * cos(radians(p.longitude) - radians(:lng))
                 + sin(radians(:lat)) * sin(radians(p.latitude)))) <= :radius
            ORDER BY (6371 * acos(cos(radians(:lat)) * cos(radians(p.latitude))
                 * cos(radians(p.longitude) - radians(:lng))
                 + sin(radians(:lat)) * sin(radians(p.latitude)))) ASC
            """, nativeQuery = true)
    List<Place> searchPlacesWithinRadius(
            @Param("keyword") String keyword,
            @Param("typeId") Long typeId,
            @Param("status") String status,
            @Param("lat") Double latitude,
            @Param("lng") Double longitude,
            @Param("radius") Double radiusKm);

    Page<Place> findByStatus(PlaceStatus status, Pageable pageable);

    /**
     * Find place by Google Place ID
     */
    java.util.Optional<Place> findByGooglePlaceId(String googlePlaceId);
}
