package com.example.vivuapp.dto.reponse.ChatAndActivity;

import com.example.vivuapp.enums.MessageType;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FileMessageResponse(
                Long id,
                Long senderId,
                String conversationId,
                String senderName,
                String senderAvatarUrl,
                String content,
                List<String> fileUrls,
                MessageType messageType,
                List<ReadReceiptResponse> readBy,
                Boolean isActive,
                Long replyToId,
                LocalDateTime timestamp) {
}
