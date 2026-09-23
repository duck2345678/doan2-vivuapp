package com.example.vivuapp.dto.reponse.ChatAndActivity;

import com.example.vivuapp.enums.FileType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record MediaAttachmentResponse(
        Long id,
        Long messageId,
        Long fileId,
        String fileUrl,
        FileType fileType,
        Long fileSize,
        LocalDateTime uploadedAt) {
}
