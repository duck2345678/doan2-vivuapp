package com.example.vivuapp.entity.PostAndInteractions;

import com.example.vivuapp.entity.Storage.FileEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "post_medias")
public class PostMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @ManyToOne(optional = false)
    @JoinColumn(name = "file_id")
    private FileEntity file;

    private Integer sortOrder;

    // Helper method để lấy URL
    public String getMediaUrl() {
        return file != null ? file.getFileUrl() : null;
    }
}
