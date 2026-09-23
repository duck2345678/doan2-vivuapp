package com.example.vnuguideapp.entity.TourAndCheckInAndItinerary;

import com.example.vnuguideapp.entity.PlaceAndMapping.Place;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "tour_stops",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_tour_stops",
                columnNames = {"tour_id", "sequence_order"}
        )
)
public class TourStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tour_id")
    private Tour tour;

    @ManyToOne(optional = false)
    @JoinColumn(name = "place_id")
    private Place place;

    @Column(nullable = false)
    private Integer sequenceOrder;

    private String note;
}

