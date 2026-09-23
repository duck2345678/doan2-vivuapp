package com.example.vivuapp.entity.TourAndCheckInAndItinerary;

import com.example.vivuapp.entity.ChatAndActivity.Conversation;
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
@Table(name = "channel_itinerary_shares")
public class ChannelItineraryShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "channel_id")
    private Conversation conversation;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tour_id")
    private Tour tour;

    @ManyToOne(optional = false)
    @JoinColumn(name = "shared_by_user_id")
    private User sharedBy;

    @Column(nullable = false)
    private LocalDateTime sharedAt;
}

