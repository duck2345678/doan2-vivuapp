package com.example.vnuguideapp.controller.ChatAndActivity;

import com.example.vnuguideapp.dto.ApiResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.ChannelMemberResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.ChannelResponse;
import com.example.vnuguideapp.dto.reponse.ChatAndActivity.JoinConversationResponse;
import com.example.vnuguideapp.dto.request.ChatAndActivity.AddChannelMemberRequest;
import com.example.vnuguideapp.dto.request.ChatAndActivity.CreateChannelRequest;
import com.example.vnuguideapp.dto.request.ChatAndActivity.UpdateChannelRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.enums.ChannelCategory;
import com.example.vnuguideapp.enums.ChannelPrivacy;
import com.example.vnuguideapp.enums.ChannelType;
import com.example.vnuguideapp.enums.ParticipantRole;
import com.example.vnuguideapp.service.ChatAndActivity.ChannelService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/channels")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Channel Management", description = "Channel CRUD and member management APIs")
@SecurityRequirement(name = "bearerAuth")
public class ChannelController {

    ChannelService channelService;
    ObjectMapper objectMapper;

    @Operation(summary = "Create new channel", description = "Creates channel. Creator becomes ADMIN. No WebSocket broadcast.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Channel created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ChannelResponse> createChannel(
            @AuthenticationPrincipal User user,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "privacy", required = false) ChannelPrivacy privacy,
            @RequestParam(value = "channelType", required = false) ChannelType channelType,
            @RequestParam(value = "category", required = false) ChannelCategory category,
            @RequestParam(value = "allowSharing", required = false) Boolean allowSharing,
            @RequestParam(value = "participantIds", required = false) String participantIdsJson,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar) throws Exception {

        // Parse participantIds from JSON string
        List<Long> participantIds = null;
        if (participantIdsJson != null && !participantIdsJson.isEmpty()) {
            participantIds = objectMapper.readValue(participantIdsJson, new TypeReference<List<Long>>() {
            });
        }

        CreateChannelRequest request = CreateChannelRequest.builder()
                .name(name)
                .description(description)
                .privacy(privacy)
                .channelType(channelType)
                .category(category)
                .allowSharing(allowSharing)
                .participantIds(participantIds)
                .build();

        ChannelResponse response = channelService.createChannel(user, request, avatar);
        return ApiResponse.<ChannelResponse>builder()
                .code(201)
                .message("Channel created successfully")
                .result(response)
                .build();
    }

    // ==================== PUBLIC CHANNEL DISCOVERY ====================

    @Operation(summary = "Discover public channels", description = "Get all public channels with optional search and category filter")
    @GetMapping("/public")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<ChannelResponse>> discoverPublicChannels(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "category", required = false) ChannelCategory category,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        List<ChannelResponse> channels = channelService.discoverPublicChannels(user, search, category, page, size);
        return ApiResponse.<List<ChannelResponse>>builder()
                .code(200)
                .message("Public channels retrieved successfully")
                .result(channels)
                .build();
    }

    // ==================== INVITE LINK ENDPOINTS ====================

    @Operation(summary = "Get channel by invite code", description = "Preview a channel using invite code before joining")
    @GetMapping("/invite/{inviteCode}")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<ChannelResponse> getChannelByInviteCode(@PathVariable String inviteCode) {
        ChannelResponse response = channelService.getChannelByInviteCode(inviteCode);
        return ApiResponse.<ChannelResponse>builder()
                .code(200)
                .message("Channel retrieved successfully")
                .result(response)
                .build();
    }

    @Operation(summary = "Join channel via invite code", description = "Join a channel using its invite code")
    @PostMapping("/invite/{inviteCode}/join")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ChannelResponse> joinChannelByInviteCode(
            @AuthenticationPrincipal User user,
            @PathVariable String inviteCode) {
        ChannelResponse response = channelService.joinChannelByInviteCode(user, inviteCode);
        return ApiResponse.<ChannelResponse>builder()
                .code(201)
                .message("Joined channel successfully")
                .result(response)
                .build();
    }

    @Operation(summary = "Regenerate invite code (ADMIN)", description = "Generate a new invite code for the channel. Old code becomes invalid.")
    @PostMapping("/{channelId}/regenerate-invite")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<ChannelResponse> regenerateInviteCode(
            @AuthenticationPrincipal User user,
            @PathVariable Long channelId) {
        ChannelResponse response = channelService.regenerateInviteCode(user, channelId);
        return ApiResponse.<ChannelResponse>builder()
                .code(200)
                .message("Invite code regenerated successfully")
                .result(response)
                .build();
    }

    // ==================== EXISTING ENDPOINTS ====================

    @GetMapping("/{channelId}")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<ChannelResponse> getChannelById(@PathVariable Long channelId) {
        ChannelResponse response = channelService.getChannelById(channelId);
        return ApiResponse.<ChannelResponse>builder()
                .code(200)
                .message("Channel retrieved successfully")
                .result(response)
                .build();
    }

    @GetMapping("/conversation/{conversationId}")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<ChannelResponse> getChannelByConversationId(
            @PathVariable String conversationId) {
        ChannelResponse response = channelService.getChannelByConversationId(conversationId);
        return ApiResponse.<ChannelResponse>builder()
                .code(200)
                .message("Channel retrieved successfully")
                .result(response)
                .build();
    }

    @Operation(summary = "Update channel (ADMIN)", description = "Update channel info. ADMIN only. WebSocket: Broadcasts to /topic/channel.{conversationId}")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Not ADMIN")
    })
    @PatchMapping(value = "/{channelId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<ChannelResponse> updateChannel(
            @AuthenticationPrincipal User user,
            @PathVariable Long channelId,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "privacy", required = false) ChannelPrivacy privacy,
            @RequestParam(value = "category", required = false) ChannelCategory category,
            @RequestParam(value = "allowSharing", required = false) Boolean allowSharing,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar) throws Exception {

        UpdateChannelRequest request = UpdateChannelRequest.builder()
                .name(name)
                .description(description)
                .privacy(privacy)
                .category(category)
                .allowSharing(allowSharing)
                .build();

        ChannelResponse response = channelService.updateChannel(user, channelId, request, avatar);
        return ApiResponse.<ChannelResponse>builder()
                .code(200)
                .message("Channel updated successfully")
                .result(response)
                .build();
    }

    @GetMapping("/{channelId}/members")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<ChannelMemberResponse>> getChannelMembers(@PathVariable Long channelId) {
        List<ChannelMemberResponse> members = channelService.getChannelMembers(channelId);
        return ApiResponse.<List<ChannelMemberResponse>>builder()
                .code(200)
                .message("Channel members retrieved successfully")
                .result(members)
                .build();
    }

    @Operation(summary = "Add members (ADMIN)", description = "Add members to channel. ADMIN only. WebSocket: Broadcasts to /topic/channel.{conversationId}")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Members added"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Not ADMIN")
    })
    @PostMapping("/{channelId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ChannelResponse> addChannelMembers(
            @AuthenticationPrincipal User user,
            @PathVariable Long channelId,
            @RequestBody @Valid AddChannelMemberRequest request) {
        ChannelResponse response = channelService.addChannelMembers(user, channelId, request);
        return ApiResponse.<ChannelResponse>builder()
                .code(201)
                .message("Members added successfully")
                .result(response)
                .build();
    }

    @Operation(summary = "Remove member (ADMIN)", description = "Remove member from channel. ADMIN only. WebSocket: Broadcasts to /topic/channel.{conversationId}")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Member removed"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Not ADMIN or removing self")
    })
    @DeleteMapping("/{channelId}/members/{memberId}")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<ChannelResponse> removeChannelMember(
            @AuthenticationPrincipal User user,
            @PathVariable Long channelId,
            @PathVariable Long memberId) {
        ChannelResponse response = channelService.removeChannelMember(user, channelId, memberId);
        return ApiResponse.<ChannelResponse>builder()
                .code(200)
                .message("Member removed successfully")
                .result(response)
                .build();
    }

    @GetMapping("/{channelId}/join-requests")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<JoinConversationResponse>> getChannelJoinRequests(
            @AuthenticationPrincipal User user,
            @PathVariable Long channelId) {
        List<JoinConversationResponse> requests = channelService.getChannelJoinRequests(user, channelId);
        return ApiResponse.<List<JoinConversationResponse>>builder()
                .code(200)
                .message("Join requests retrieved successfully")
                .result(requests)
                .build();
    }

    @Operation(summary = "Update member role (ADMIN)", description = "Promote or demote a member. ADMIN only.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Role updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Not ADMIN or updating self")
    })
    @PatchMapping("/{channelId}/members/{memberId}/role")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<ChannelMemberResponse> updateMemberRole(
            @AuthenticationPrincipal User user,
            @PathVariable Long channelId,
            @PathVariable Long memberId,
            @RequestParam("role") ParticipantRole role) {
        ChannelMemberResponse response = channelService.updateMemberRole(user, channelId, memberId, role);
        return ApiResponse.<ChannelMemberResponse>builder()
                .code(200)
                .message("Member role updated successfully")
                .result(response)
                .build();
    }
}
