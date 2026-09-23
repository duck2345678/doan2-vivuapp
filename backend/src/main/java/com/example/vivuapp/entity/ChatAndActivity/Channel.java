package com.example.vivuapp.entity.ChatAndActivity;

import com.example.vivuapp.entity.Storage.FileEntity;
import com.example.vivuapp.enums.ChannelCategory;
import com.example.vivuapp.enums.ChannelPrivacy;
import com.example.vivuapp.enums.ChannelType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "channels")
@EntityListeners(AuditingEntityListener.class)
public class Channel {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private ChannelPrivacy privacy = ChannelPrivacy.PUBLIC;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private ChannelType channelType = ChannelType.TEXT;

  @Enumerated(EnumType.STRING)
  @Column(length = 20)
  @Builder.Default
  private ChannelCategory category = ChannelCategory.OTHER;

  // Invite code for private channels (unique identifier for invite links)
  @Column(unique = true, length = 32)
  private String inviteCode;

  // Allow sharing in channel
  @Builder.Default
  @Column(columnDefinition = "boolean default true")
  private Boolean allowSharing = true;

  // Avatar for channel
  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "avatar_id")
  private FileEntity avatar;

  // 1-1 relationship with Conversation (type = CHANNEL)
  @OneToOne(optional = false)
  @JoinColumn(name = "conversation_id", unique = true)
  private Conversation conversation;

  @Builder.Default
  @Column(nullable = false)
  private Long memberCount = 0L;

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  @Column(insertable = false)
  private LocalDateTime updatedAt;
}
