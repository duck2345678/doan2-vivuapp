package com.example.vivuapp.controller.ChatAndActivity;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.ChatAndActivity.ConversationResponse;
import com.example.vivuapp.dto.reponse.ChatAndActivity.DirectConversationResponse;
import com.example.vivuapp.dto.reponse.ChatAndActivity.MediaAttachmentResponse;
import com.example.vivuapp.dto.request.ChatAndActivity.ConversationPrivateRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.enums.ConversationType;
import com.example.vivuapp.enums.FileType;
import com.example.vivuapp.enums.ParticipantStatus;
import com.example.vivuapp.enums.RelationshipStatus;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vivuapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vivuapp.service.ChatAndActivity.ConversationService;
import com.example.vivuapp.service.ChatAndActivity.DirectConversationService;
import com.example.vivuapp.service.ChatAndActivity.MessageService;
import com.example.vivuapp.service.AccountAndAuthorization.RelationshipService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/api/v1/conversations")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Conversation", description = "APIs for managing conversations")
public class ConservationController {

        ConversationService conversationService;
        DirectConversationService directConversationService;
        MessageService messageService;
        RelationshipService relationshipService;
        UserRepository userRepository;
        UserProfileRepository userProfileRepository;

        @PostMapping("/create")
        @ResponseStatus(HttpStatus.CREATED)
        public ApiResponse<String> createPrivateConservation(
                        @AuthenticationPrincipal User user,
                        @RequestBody ConversationPrivateRequest conversationPrivateRequest) {
                String reponse = conversationService.createPrivateConversation(user, conversationPrivateRequest);
                return ApiResponse.<String>builder()
                                .code(200)
                                .message("Create conversation successfully")
                                .result(reponse)
                                .build();
        }

        @GetMapping("/private")
        public ApiResponse<Slice<ConversationResponse>> getPrivateConversations(
                        @AuthenticationPrincipal User user,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<ConversationResponse> conversations = conversationService.getConversationsByType(user,
                                ConversationType.DIRECT, pageable);
                return ApiResponse.<Slice<ConversationResponse>>builder()
                                .code(200)
                                .message("Get private conversations successfully")
                                .result(conversations)
                                .build();
        }

        @GetMapping("/channels")
        public ApiResponse<Slice<ConversationResponse>> getChannelConversations(
                        @AuthenticationPrincipal User user,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<ConversationResponse> conversations = conversationService.getConversationsByType(user,
                                ConversationType.CHANNEL, pageable);
                return ApiResponse.<Slice<ConversationResponse>>builder()
                                .code(200)
                                .message("Get channel conversations successfully")
                                .result(conversations)
                                .build();
        }

        /**
         * Get conversations filtered by participant status (INBOX or REQUEST).
         */
        @GetMapping
        @Operation(summary = "Get conversations by status", description = "Get conversations filtered by participant status")
        public ApiResponse<Slice<ConversationResponse>> getConversationsByStatus(
                        @AuthenticationPrincipal User user,
                        @RequestParam(defaultValue = "INBOX") ParticipantStatus status,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {
                Pageable pageable = PageRequest.of(page, size);
                Slice<ConversationResponse> conversations = conversationService.getConversationsByStatus(user, status,
                                pageable);
                return ApiResponse.<Slice<ConversationResponse>>builder()
                                .code(200)
                                .message("Get conversations successfully")
                                .result(conversations)
                                .build();
        }

        /**
         * Get or create a DIRECT conversation with a specific user.
         */
        @GetMapping("/direct/{targetId}")
        @Operation(summary = "Get/create direct conversation", description = "Get existing or create new DIRECT conversation with relationship status")
        public ApiResponse<DirectConversationResponse> getOrCreateDirectConversation(
                        @AuthenticationPrincipal User user,
                        @PathVariable Long targetId) {
                
                RelationshipStatus status = relationshipService.getRelationshipStatus(user.getId(), targetId);
                boolean areFriends = (status == RelationshipStatus.ACCEPTED);
                
                var conversation = directConversationService.getOrCreate(user.getId(), targetId, areFriends);
                
                User targetUser = userRepository.findById(targetId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                
                UserProfile targetProfile = userProfileRepository.findByUserId(targetId).orElse(null);
                
                String displayName = targetProfile != null && targetProfile.getDisplayName() != null
                        ? targetProfile.getDisplayName()
                        : targetUser.getFirstName() + " " + targetUser.getLastName();
                
                String avatarUrl = targetProfile != null ? targetProfile.getAvatarUrl() : null;
                
                DirectConversationResponse response = DirectConversationResponse.builder()
                        .conversationId(conversation.getId())
                        .isNew(conversation.getLastMessage() == null)
                        .areFriends(areFriends)
                        .relationshipStatus(status != null ? status : RelationshipStatus.NONE)
                        .otherUserId(targetId)
                        .otherUserDisplayName(displayName)
                        .otherUserAvatarUrl(avatarUrl)
                        .build();
                
                return ApiResponse.<DirectConversationResponse>builder()
                        .code(200)
                        .message("Direct conversation retrieved")
                        .result(response)
                        .build();
        }

        /**
         * Accept a message request - moves conversation from REQUEST to INBOX.
         */
        @PostMapping("/{conversationId}/accept")
        @Operation(summary = "Accept message request", description = "Accept a message request and move conversation to inbox")
        public ApiResponse<String> acceptMessageRequest(
                        @AuthenticationPrincipal User user,
                        @PathVariable String conversationId) {
                messageService.acceptMessageRequest(user, conversationId);
                return ApiResponse.<String>builder()
                                .code(200)
                                .message("Message request accepted")
                                .result("Conversation moved to inbox")
                                .build();
        }

        @DeleteMapping("/delete-conversation/{conversationId}")
        public ApiResponse<String> deleteConversationById(
                        @AuthenticationPrincipal User user,
                        @PathVariable("conversationId") String conversationId) {
                String reponse = conversationService.leaveConversation(user, conversationId);
                return ApiResponse.<String>builder()
                                .code(200)
                                .message("Delete conversation successfully")
                                .result(reponse)
                                .build();
        }

        @GetMapping("/{conversationId}/media")
        public ApiResponse<List<MediaAttachmentResponse>> getConversationMedia(
                        @AuthenticationPrincipal User user,
                        @PathVariable("conversationId") String conversationId,
                        @RequestParam(value = "fileType", required = false) FileType fileType) {
                List<MediaAttachmentResponse> media = conversationService.getConversationMedia(user, conversationId,
                                fileType);
                return ApiResponse.<List<MediaAttachmentResponse>>builder()
                                .code(200)
                                .message("Get conversation media successfully")
                                .result(media)
                                .build();
        }

}
