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
@Table(name = "tour_copy_history")
public class TourCopyHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "original_tour_id")
    private Tour originalTour;

    @ManyToOne(optional = false)
    @JoinColumn(name = "copied_tour_id")
    private Tour copiedTour;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "channel_id")
    private Conversation conversation;

    @Column(nullable = false)
    private LocalDateTime copiedAt;
}

