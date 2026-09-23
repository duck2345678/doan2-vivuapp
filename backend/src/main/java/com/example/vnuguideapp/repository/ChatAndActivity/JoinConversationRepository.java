package com.example.vnuguideapp.repository.ChatAndActivity;

import com.example.vnuguideapp.entity.ChatAndActivity.JoinConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface JoinConversationRepository extends JpaRepository<JoinConversation, Long> {

  @Query("SELECT CASE WHEN COUNT(j) > 0 THEN true ELSE false END FROM JoinConversation j " +
      "WHERE j.user.id = :userId AND j.conversation.id = :conversationId AND j.status = com.example.vnuguideapp.enums.JoinRequestStatus.PENDING")
  boolean existsPendingRequest(@Param("userId") Long userId, @Param("conversationId") String conversationId);

  List<JoinConversation> findByConversationId(String conversationId);
}
