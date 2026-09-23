package com.example.vivuapp.entity.AccountAndAuthorization;


import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "user_connections",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_connections",
                columnNames = {"user_id", "connected_user_id"}
        )
)
public class UserConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;


    @ManyToOne
    @JoinColumn(name = "connected_user_id", nullable = false)
    private User connectedUser;

    @Column(nullable = false)
    private LocalDateTime connectedSince;
}
