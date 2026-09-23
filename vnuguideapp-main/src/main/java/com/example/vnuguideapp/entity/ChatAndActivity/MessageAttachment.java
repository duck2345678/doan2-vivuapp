package com.example.vnuguideapp.entity.ChatAndActivity;

import com.example.vnuguideapp.entity.Storage.FileEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "message_attachments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageAttachment {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "message_id", nullable = false)
  private Message message;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "file_id", nullable = false)
  private FileEntity file;
}
