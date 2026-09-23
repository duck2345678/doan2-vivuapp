package com.example.vivuapp.dto.reponse;

import com.example.vivuapp.enums.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private boolean isRead;
    private ActorInfo actor;
    private ReferenceData reference;
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class ActorInfo {
        private Long id;
        private String displayName;
        private String avatarUrl;
    }

    @Data
    @Builder
    public static class ReferenceData {
        private Long postId;
        private Long commentId;
        private String conversationId;
        private Long userId;
    }
}
