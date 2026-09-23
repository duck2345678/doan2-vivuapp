package com.example.vnuguideapp.entity.PostAndInteractions;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "post_locations")
public class PostLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String address;

    private Double lat;
    private Double lng;

    @Column(length = 200)
    private String placeId;
}
