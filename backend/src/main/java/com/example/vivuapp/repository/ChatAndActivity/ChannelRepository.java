package com.example.vivuapp.repository.ChatAndActivity;

import com.example.vivuapp.entity.ChatAndActivity.Channel;
import com.example.vivuapp.enums.ChannelCategory;
import com.example.vivuapp.enums.ChannelPrivacy;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {

  Optional<Channel> findByConversationId(String conversationId);

  Slice<Channel> findByPrivacyOrderByCreatedAtDesc(ChannelPrivacy privacy, Pageable pageable);

  // Search public channels by name (case-insensitive)
  @Query("SELECT c FROM Channel c WHERE c.privacy = :privacy AND LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) ORDER BY c.memberCount DESC, c.createdAt DESC")
  Slice<Channel> searchPublicChannels(@Param("privacy") ChannelPrivacy privacy, @Param("search") String search, Pageable pageable);

  // Find public channels by category
  Slice<Channel> findByPrivacyAndCategoryOrderByMemberCountDesc(ChannelPrivacy privacy, ChannelCategory category, Pageable pageable);

  // Find channel by invite code
  Optional<Channel> findByInviteCode(String inviteCode);

  boolean existsByConversationId(String conversationId);

  boolean existsByInviteCode(String inviteCode);
}
