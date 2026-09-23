package com.example.vnuguideapp.entity.PostAndInteractions;

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
    name = "post_places",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_post_places",
        columnNames = {"post_id", "place_id"}
    )
)
public class PostPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @ManyToOne(optional = false)
    @JoinColumn(name = "place_id")
    private Place place;
}

