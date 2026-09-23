package com.example.vnuguideapp.dto.reponse.PostAndInteractions;

import com.example.vnuguideapp.enums.PostType;
import com.example.vnuguideapp.enums.Visibility;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for a post in the feed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FeedPostResponse {

    Long id;
    Long authorId;
    String authorName;
    String authorAvatarUrl;

    PostType postType;
    String content;
    Visibility visibility;

    // Tour share specific
    Long tourId;
    String tourName;
    String staticMapUrl;
    Integer tourStopCount;

    // Media
    List<String> mediaUrls;

    // Engagement
    Long reactionCount;
    Long commentCount;
    Integer shareCount;

    // User-specific
    Boolean hasReacted;
    Boolean hasSaved;
    String source; // "FRIEND" or "RECOMMENDATION"

    LocalDateTime createdAt;
}
