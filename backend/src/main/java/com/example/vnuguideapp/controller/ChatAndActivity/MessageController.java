package com.example.vnuguideapp.controller.ChatAndActivity;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.FileMessageResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.MessageResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.MessageSearchResponse;
import com.example.vnuguideapp.dto.request.ChatAndActivity.MarkReadRequest;
import com.example.vnuguideapp.dto.request.ChatAndActivity.MessageRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.exception.exceptionImpl.BadRequestException;
import com.example.vnuguideapp.service.ChatAndActivity.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/messages")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Message", description = "APIs for managing messages")
public class MessageController {

        MessageService messageService;

        @Operation(summary = "Send message", description = "Send text message to conversation. WebSocket: Broadcasts to /topic/conversation.{conversationId}")
        @PostMapping("/send")
        public ApiResponse<MessageResponse> sendMessage(
                        @AuthenticationPrincipal User user,
                        @RequestBody MessageRequest messageRequest) {
                MessageResponse response = messageService.sendMessage(user, messageRequest);
                return ApiResponse.<MessageResponse>builder()
                                .code(200)
                                .message("Message sent successfully")
                                .result(response)
                                .build();
        }

        @Operation(summary = "Send message with files", description = "Upload files with message. WebSocket: Broadcasts to /topic/conversation.{conversationId}")
        @PostMapping(value = "/upload-file", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
        public ApiResponse<FileMessageResponse> sendMessageWithFile(
                        @AuthenticationPrincipal User user,
                        @RequestPart("files") @NotNull List<MultipartFile> files,
                        @RequestParam("conversationId") @NotNull String conversationId,
                        @RequestParam(value = "content", required = false) String content,
                        @RequestParam(value = "replyToId", required = false) Long replyToId) {
                if (files == null || files.isEmpty()) {
                        throw new BadRequestException("No files provided");
                }

                // Validate từng file
                for (MultipartFile file : files) {
                        if (file.isEmpty()) {
                                throw new BadRequestException("One of the files is empty");
                        }
                        if (file.getSize() > 20 * 1024 * 1024) {
                                throw new BadRequestException("One of the files exceeds 20MB limit");
                        }
                }

                FileMessageResponse response = messageService.sendMessageWithFile(
                                user, files, conversationId, content, replyToId);
                return ApiResponse.<FileMessageResponse>builder()
                                .code(200)
                                .message("Message with file sent successfully")
                                .result(response)
                                .build();
        }

        @GetMapping
        public ApiResponse<Slice<MessageResponse>> getAllMessagesByConversationId(
                        @AuthenticationPrincipal User user,
                        @RequestParam @NotBlank String conversationId,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<MessageResponse> conversation = messageService.getMessagesByConversationId(user, conversationId,
                                pageable);
                return ApiResponse.<Slice<MessageResponse>>builder()
                                .code(200)
                                .message("Get conversation successfully")
                                .result(conversation)
                                .build();
        }

        @Operation(summary = "Delete message", description = "Soft delete message. WebSocket: Broadcasts to /topic/conversation.{conversationId}")
        @DeleteMapping("/{messageId}")
        public ApiResponse<String> deleteMessage(
                        @AuthenticationPrincipal User user,
                        @PathVariable("messageId") Long messageId) {
                String response = messageService.deleteMessage(user, messageId);
                return ApiResponse.<String>builder()
                                .code(200)
                                .message("Message deleted successfully")
                                .result(response)
                                .build();
        }

        @PutMapping("/{messageId}")
        public ApiResponse<MessageResponse> editMessage(
                        @AuthenticationPrincipal User user,
                        @PathVariable("messageId") Long messageId,
                        @RequestBody @NotBlank String newContent) {
                MessageResponse response = messageService.editMessage(user, messageId, newContent);
                return ApiResponse.<MessageResponse>builder()
                                .code(200)
                                .message("Message edited successfully")
                                .result(response)
                                .build();
        }

        @PostMapping("/mark-read")
        public ApiResponse<Void> markConversationAsRead(
                        @AuthenticationPrincipal User user,
                        @RequestBody MarkReadRequest request) {
                messageService.markAsRead(user, request.conversationId(), request.messageId());
                return ApiResponse.<Void>builder()
                                .code(200)
                                .message("Conversation marked as read")
                                .build();
        }

        @GetMapping("/search")
        @Operation(summary = "Search messages in a specific conversation")
        public ApiResponse<Slice<MessageSearchResponse>> searchInConversation(
                        @AuthenticationPrincipal User user,
                        @RequestParam @NotBlank String conversationId,
                        @RequestParam @NotBlank String keyword,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<MessageSearchResponse> results = messageService.searchInConversation(user, conversationId,
                                keyword, pageable);
                return ApiResponse.<Slice<MessageSearchResponse>>builder()
                                .code(200)
                                .message("Search completed")
                                .result(results)
                                .build();
        }

}
