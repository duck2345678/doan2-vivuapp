package com.example.vivuapp.dto.request.ReportAndSystemSetting;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateReportRequest {

    @NotNull(message = "Report type ID is required")
    Long reportTypeId;

    // Target options - only one should be provided
    Long targetPostId;
    Long targetCommentId;
    Long targetUserId;
    String targetConversationId;

    @Size(max = 1000, message = "Description must be less than 1000 characters")
    String description;
}
