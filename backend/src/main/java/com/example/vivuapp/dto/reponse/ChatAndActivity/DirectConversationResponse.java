package com.example.vivuapp.dto.reponse.ChatAndActivity;

import com.example.vivuapp.enums.RelationshipStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DirectConversationResponse {
    private String conversationId;
    private boolean isNew;
    private boolean areFriends;
    private RelationshipStatus relationshipStatus;
    private Long otherUserId;
    private String otherUserDisplayName;
    private String otherUserAvatarUrl;
}
