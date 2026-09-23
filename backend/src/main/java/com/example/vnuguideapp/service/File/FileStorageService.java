package com.example.vnuguideapp.service.File;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.vnuguideapp.entity.Storage.FileEntity;
import com.example.vnuguideapp.enums.FileCategory;
import com.example.vnuguideapp.enums.FileType;
import com.example.vnuguideapp.exception.exceptionImpl.BadRequestException;
import com.example.vnuguideapp.repository.File.FileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final Cloudinary cloudinary;
    private final FileRepository fileRepository;

    private String getFolderByCategory(FileCategory category) {
        return switch (category) {
            case CHAT -> "chat_uploads";
            case POST_MEDIA -> "post_uploads";
            case CHANNEL_AVATAR -> "channel_avatars";
            case PROFILE_AVATAR -> "profile_avatars";
            case PROFILE_COVER -> "profile_covers";
        };
    }

    private String getResourceType(FileType fileType) {
        return switch (fileType) {
            case IMAGE -> "image";
            case VIDEO -> "video";
            case AUDIO -> "video"; // Cloudinary treat audio as video
            case DOCUMENT -> "raw";
        };
    }

    /**
     * Auto-detect FileType from file content-type
     */
    private FileType determineFileType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null) {
            if (contentType.startsWith("image/"))
                return FileType.IMAGE;
            if (contentType.startsWith("video/"))
                return FileType.VIDEO;
            if (contentType.startsWith("audio/"))
                return FileType.AUDIO;
        }
        return FileType.DOCUMENT;
    }

    /**
     * Upload multiple files with auto-detect FileType for each file
     */
    public List<FileEntity> uploadMultipleFiles(List<MultipartFile> files, FileCategory fileCategory) {
        List<FileEntity> savedFiles = new ArrayList<>();
        String folder = getFolderByCategory(fileCategory);

        for (MultipartFile file : files) {
            try {
                // 1. Auto-detect FileType for this file
                FileType fileType = determineFileType(file);
                String resourceType = getResourceType(fileType);

                // 2. Upload to Cloudinary
                Map params = ObjectUtils.asMap(
                        "resource_type", resourceType,
                        "folder", folder);

                Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
                String fileUrl = (String) uploadResult.get("secure_url");

                // 3. Save to DB
                FileEntity fileEntity = FileEntity.builder()
                        .fileCategory(fileCategory)
                        .fileType(fileType)
                        .fileUrl(fileUrl)
                        .fileSize(file.getSize())
                        .build();

                FileEntity savedFile = fileRepository.save(fileEntity);

                log.info("Uploaded file: ID={}, URL={}, Type={}, Category={}, Size={}",
                        savedFile.getId(), fileUrl, fileType, fileCategory, file.getSize());

                savedFiles.add(savedFile);

            } catch (IOException e) {
                log.error("Error uploading file '{}': {}",
                        file.getOriginalFilename(), e.getMessage());
                throw new BadRequestException("Failed to upload file: " + file.getOriginalFilename());
            }
        }

        return savedFiles;
    }

    /**
     * Upload single file with auto-detect FileType
     */
    public FileEntity uploadFile(MultipartFile file, FileCategory fileCategory) {
        try {
            // 1. Auto-detect FileType
            FileType fileType = determineFileType(file);
            String resourceType = getResourceType(fileType);
            String folder = getFolderByCategory(fileCategory);

            // 2. Upload to Cloudinary
            Map params = ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "folder", folder);

            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
            String fileUrl = (String) uploadResult.get("secure_url");

            // 3. Save to DB
            FileEntity fileEntity = FileEntity.builder()
                    .fileCategory(fileCategory)
                    .fileType(fileType)
                    .fileUrl(fileUrl)
                    .fileSize(file.getSize())
                    .build();

            FileEntity savedFile = fileRepository.save(fileEntity);

            log.info("Uploaded file: ID={}, URL={}, Type={}, Category={}, Size={}",
                    savedFile.getId(), fileUrl, fileType, fileCategory, file.getSize());

            return savedFile;
        } catch (IOException e) {
            log.error("Upload failed for file {}: {}", file.getOriginalFilename(), e.getMessage());
            throw new BadRequestException("File upload failed: " + e.getMessage());
        }
    }
}
