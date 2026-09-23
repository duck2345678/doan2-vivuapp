package com.example.vivuapp.entity.TourAndCheckInAndItinerary;

import com.example.vivuapp.entity.PlaceAndMapping.Place;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "check_ins")
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "tour_id")
    private Tour tour;

    @ManyToOne(optional = false)
    @JoinColumn(name = "place_id")
    private Place place;

    @Column(nullable = false)
    private LocalDateTime checkedInAt;

    private String note;
}

