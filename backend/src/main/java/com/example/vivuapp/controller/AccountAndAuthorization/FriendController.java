package com.example.vivuapp.controller.AccountAndAuthorization;

import com.example.vivuapp.dto.reponse.AccountAndAuthorization.RelationshipStatusResponse;
import com.example.vivuapp.dto.reponse.AccountAndAuthorization.UserSummaryResponse;
import com.example.vivuapp.entity.AccountAndAuthorization.Relationship;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.enums.RelationshipStatus;
import com.example.vivuapp.service.AccountAndAuthorization.RelationshipService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for managing friend relationships.
 * Handles friend requests, blocking, and relationship queries.
 */
@RestController
@RequestMapping("/api/v1/friends")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Friends", description = "Friend relationship management APIs")
public class FriendController {

    private final RelationshipService relationshipService;

    // ==================== FRIEND REQUEST ACTIONS ====================

    @PostMapping("/request/{targetId}")
    @Operation(summary = "Send friend request", description = "Send a friend request to another user")
    public ResponseEntity<?> sendFriendRequest(
            @AuthenticationPrincipal User user,
            @PathVariable Long targetId) {

        log.info("User {} sending friend request to {}", user.getId(), targetId);
        relationshipService.sendFriendRequest(user.getId(), targetId);
        return ResponseEntity.ok(Map.of("message", "Friend request sent"));
    }

    @PostMapping("/accept/{requesterId}")
    @Operation(summary = "Accept friend request", description = "Accept an incoming friend request")
    public ResponseEntity<?> acceptFriendRequest(
            @AuthenticationPrincipal User user,
            @PathVariable Long requesterId) {

        log.info("User {} accepting friend request from {}", user.getId(), requesterId);
        relationshipService.acceptFriendRequest(user.getId(), requesterId);
        return ResponseEntity.ok(Map.of("message", "Friend request accepted"));
    }

    @PostMapping("/decline/{requesterId}")
    @Operation(summary = "Decline friend request", description = "Decline an incoming friend request")
    public ResponseEntity<?> declineFriendRequest(
            @AuthenticationPrincipal User user,
            @PathVariable Long requesterId) {

        log.info("User {} declining friend request from {}", user.getId(), requesterId);
        relationshipService.declineFriendRequest(user.getId(), requesterId);
        return ResponseEntity.ok(Map.of("message", "Friend request declined"));
    }

    @PostMapping("/cancel/{targetId}")
    @Operation(summary = "Cancel friend request", description = "Cancel an outgoing friend request")
    public ResponseEntity<?> cancelFriendRequest(
            @AuthenticationPrincipal User user,
            @PathVariable Long targetId) {

        log.info("User {} canceling friend request to {}", user.getId(), targetId);
        relationshipService.cancelFriendRequest(user.getId(), targetId);
        return ResponseEntity.ok(Map.of("message", "Friend request cancelled"));
    }

    @DeleteMapping("/{friendId}")
    @Operation(summary = "Remove friend", description = "Remove a friend from your friends list")
    public ResponseEntity<?> removeFriend(
            @AuthenticationPrincipal User user,
            @PathVariable Long friendId) {

        log.info("User {} removing friend {}", user.getId(), friendId);
        relationshipService.removeFriend(user.getId(), friendId);
        return ResponseEntity.ok(Map.of("message", "Friend removed"));
    }

    // ==================== BLOCKING ====================

    @PostMapping("/block/{targetId}")
    @Operation(summary = "Block user", description = "Block a user from contacting you")
    public ResponseEntity<?> blockUser(
            @AuthenticationPrincipal User user,
            @PathVariable Long targetId) {

        log.info("User {} blocking user {}", user.getId(), targetId);
        relationshipService.blockUser(user.getId(), targetId);
        return ResponseEntity.ok(Map.of("message", "User blocked"));
    }

    @DeleteMapping("/block/{targetId}")
    @Operation(summary = "Unblock user", description = "Unblock a previously blocked user")
    public ResponseEntity<?> unblockUser(
            @AuthenticationPrincipal User user,
            @PathVariable Long targetId) {

        log.info("User {} unblocking user {}", user.getId(), targetId);
        relationshipService.unblockUser(user.getId(), targetId);
        return ResponseEntity.ok(Map.of("message", "User unblocked"));
    }

    // ==================== QUERIES ====================

    @GetMapping("/status/{targetId}")
    @Operation(summary = "Get relationship status", description = "Get the relationship status with another user")
    public ResponseEntity<RelationshipStatusResponse> getRelationshipStatus(
            @AuthenticationPrincipal User user,
            @PathVariable Long targetId) {

        RelationshipStatus status = relationshipService.getRelationshipStatus(user.getId(), targetId);
        boolean areFriends = status == RelationshipStatus.ACCEPTED;

        return ResponseEntity.ok(RelationshipStatusResponse.builder()
                .targetUserId(targetId)
                .status(status)
                .areFriends(areFriends)
                .build());
    }

    @GetMapping
    @Operation(summary = "Get friends list", description = "Get paginated list of your friends")
    public ResponseEntity<Slice<UserSummaryResponse>> getFriends(
            @AuthenticationPrincipal User user,
            Pageable pageable) {

        Slice<Relationship> friends = relationshipService.getFriends(user.getId(), pageable);
        Slice<UserSummaryResponse> response = friends.map(r -> mapToUserSummary(r.getAddressee()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/requests/incoming")
    @Operation(summary = "Get incoming requests", description = "Get paginated list of incoming friend requests")
    public ResponseEntity<Slice<UserSummaryResponse>> getIncomingRequests(
            @AuthenticationPrincipal User user,
            Pageable pageable) {

        Slice<Relationship> requests = relationshipService.getIncomingRequests(user.getId(), pageable);
        Slice<UserSummaryResponse> response = requests.map(r -> mapToUserSummary(r.getRequester()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/requests/outgoing")
    @Operation(summary = "Get outgoing requests", description = "Get paginated list of your outgoing friend requests")
    public ResponseEntity<Slice<UserSummaryResponse>> getOutgoingRequests(
            @AuthenticationPrincipal User user,
            Pageable pageable) {

        Slice<Relationship> requests = relationshipService.getOutgoingRequests(user.getId(), pageable);
        Slice<UserSummaryResponse> response = requests.map(r -> mapToUserSummary(r.getAddressee()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/count")
    @Operation(summary = "Get friend counts", description = "Get counts of friends and pending requests")
    public ResponseEntity<?> getCounts(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of(
                "friendsCount", relationshipService.countFriends(user.getId()),
                "pendingRequestsCount", relationshipService.countPendingRequests(user.getId())));
    }

    // ==================== HELPERS ====================

    private UserSummaryResponse mapToUserSummary(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .build();
    }
}
