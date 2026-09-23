package com.example.vnuguideapp.controller.ChatAndActivity;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.JoinConversationResponse;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.ChatAndActivity.Conversation;
import com.example.vnuguideapp.service.ChatAndActivity.ConversationService;
import com.example.vnuguideapp.service.ChatAndActivity.JoinConversationService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Join Conversation", description = "APIs for joining conversations")
@RequestMapping("/api/v1/conversations/join")
public class JoinConversationController {

        JoinConversationService conversationService;

        @Operation(summary = "Send join request", description = "Request to join private channel. WebSocket: Notifies ADMINs via /user/queue/join-conversation")
        @PostMapping("/{conversationId}")
        public ApiResponse<JoinConversationResponse> sendJoinConversationRequest(
                        @PathVariable String conversationId,
                        @AuthenticationPrincipal User user) {

                JoinConversationResponse response = conversationService.sendJoinConversationRequest(user,
                                conversationId);

                return ApiResponse.<JoinConversationResponse>builder()
                                .code(200)
                                .message("Joined conversation successfully")
                                .result(response)
                                .build();
        }

        @Operation(summary = "Accept join request (ADMIN)", description = "Accept join request. ADMIN only. WebSocket: Sends ACCEPT event to requester via /user/queue/join-conversation")
        @PostMapping("/accept/{joinRequestId}")
        public ApiResponse<JoinConversationResponse> acceptJoinRequest(
                        @PathVariable Long joinRequestId,
                        @AuthenticationPrincipal User user) {

                JoinConversationResponse response = conversationService.acceptJoinRequest(user, joinRequestId);

                return ApiResponse.<JoinConversationResponse>builder()
                                .code(200)
                                .message("Accepted join request successfully")
                                .result(response)
                                .build();
        }

        @Operation(summary = "Reject join request (ADMIN)", description = "Reject join request. ADMIN only. WebSocket: Sends REJECT event to requester via /user/queue/join-conversation")
        @PatchMapping("/reject/{joinRequestId}")
        public ApiResponse<JoinConversationResponse> rejectJoinRequest(
                        @PathVariable Long joinRequestId,
                        @AuthenticationPrincipal User user) {

                JoinConversationResponse response = conversationService.rejectJoinRequest(user, joinRequestId);

                return ApiResponse.<JoinConversationResponse>builder()
                                .code(200)
                                .message("Rejected join request successfully")
                                .result(response)
                                .build();
        }

}
