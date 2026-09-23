package com.example.vivuapp.dto.reponse.ReportAndSystemSetting;

import com.example.vivuapp.enums.ReportStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportResponse {

    Long id;

    // Reporter info
    Long reporterId;
    String reporterUsername;

    // Report type
    Long reportTypeId;
    String reportTypeCode;
    String reportTypeName;

    // Target info (only one will be set)
    Long targetPostId;
    Long targetCommentId;
    Long targetUserId;
    String targetConversationId;

    String description;
    ReportStatus status;
    LocalDateTime reportedAt;
}
