package com.example.vivuapp.service.AccountAndAuthorization;

import com.example.vivuapp.entity.AccountAndAuthorization.Relationship;
import com.example.vivuapp.entity.AccountAndAuthorization.RelationshipId;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.ChatAndActivity.Participant;
import com.example.vivuapp.enums.ParticipantStatus;
import com.example.vivuapp.enums.RelationshipStatus;
import com.example.vivuapp.exception.exceptionImpl.BadRequestException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.AccountAndAuthorization.RelationshipRepository;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vivuapp.repository.ChatAndActivity.ConversationRepository;
import com.example.vivuapp.repository.ChatAndActivity.ParticipantRepository;
import com.example.vivuapp.service.Notification.NotificationService;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;

/**
 * Service for managing relationships between users (friend requests, blocking,
 * etc.).
 * Implements a two-row model where each user has their own view of the
 * relationship.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class RelationshipService {

    RelationshipRepository relationshipRepository;
    UserRepository userRepository;
    ConversationRepository conversationRepository;
    ParticipantRepository participantRepository;
    @Lazy
    NotificationService notificationService;

    /**
     * Send a friend request from requester to addressee.
     * Creates two rows: PENDING_OUTGOING for requester, PENDING_INCOMING for
     * addressee.
     */
    @Transactional
    public void sendFriendRequest(Long requesterId, Long addresseeId) {
        // Fetch users (replaces existsById checks)
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Requester user not found"));
        User addressee = userRepository.findById(addresseeId)
                .orElseThrow(() -> new ResourceNotFoundException("Addressee user not found"));

        // Cannot send request to self
        if (requesterId.equals(addresseeId)) {
            throw new BadRequestException("Cannot send friend request to yourself");
        }

        // Check if relationship already exists
        var existing = relationshipRepository.findById_RequesterIdAndId_AddresseeId(requesterId, addresseeId);
        if (existing.isPresent()) {
            RelationshipStatus status = existing.get().getStatus();
            switch (status) {
                case ACCEPTED -> throw new BadRequestException("Already friends");
                case PENDING_OUTGOING -> throw new BadRequestException("Friend request already sent");
                case PENDING_INCOMING -> {
                    // If they have a pending request to us, accept it instead
                    acceptFriendRequest(requesterId, addresseeId);
                    return;
                }
                case BLOCKED -> throw new BadRequestException("You have blocked this user");
                case RESTRICTED -> throw new BadRequestException("Relationship is restricted");
            }
        }

        // Check if blocked by the other user
        if (relationshipRepository.isBlockedBy(requesterId, addresseeId)) {
            throw new BadRequestException("Cannot send friend request to this user");
        }

        // Create both relationship rows
        Relationship[] pair = Relationship.createFriendRequestPair(requesterId, addresseeId);

        // Set User entities on Relationship objects (CRITICAL FIX for JPA @MapsId)
        pair[0].setRequester(requester);
        pair[0].setAddressee(addressee);

        pair[1].setRequester(addressee);
        pair[1].setAddressee(requester);

        relationshipRepository.saveAll(Arrays.asList(pair));

        // Send notification to addressee
        notificationService.notifyFriendRequest(addressee, requester);

        log.info("Friend request sent from {} to {}", requesterId, addresseeId);
    }

    /**
     * Accept a friend request.
     * Updates both rows to ACCEPTED and upgrades existing DIRECT conversation
     * participants to INBOX.
     */
    @Transactional
    public void acceptFriendRequest(Long userId, Long requesterId) {
        // Find my view of the relationship (should be PENDING_INCOMING)
        var myRelationship = relationshipRepository.findById_RequesterIdAndId_AddresseeId(userId, requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend request not found"));

        if (myRelationship.getStatus() != RelationshipStatus.PENDING_INCOMING) {
            throw new BadRequestException("No pending friend request from this user");
        }

        // Find their view
        var theirRelationship = relationshipRepository.findById_RequesterIdAndId_AddresseeId(requesterId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend request data inconsistent"));

        // Update both to ACCEPTED
        LocalDateTime now = LocalDateTime.now();
        myRelationship.setStatus(RelationshipStatus.ACCEPTED);
        myRelationship.setUpdatedAt(now);
        theirRelationship.setStatus(RelationshipStatus.ACCEPTED);
        theirRelationship.setUpdatedAt(now);

        relationshipRepository.save(myRelationship);
        relationshipRepository.save(theirRelationship);

        // Auto-upgrade existing DIRECT conversation to INBOX for both users
        upgradeExistingConversationToInbox(userId, requesterId);

        // Send notification to the original requester
        User accepter = userRepository.findById(userId).orElse(null);
        User originalRequester = userRepository.findById(requesterId).orElse(null);
        if (accepter != null && originalRequester != null) {
            notificationService.notifyFriendAccepted(originalRequester, accepter);
        }

        log.info("Friend request accepted: {} accepted {}", userId, requesterId);
    }

    /**
     * Decline a friend request.
     * Deletes both relationship rows.
     */
    @Transactional
    public void declineFriendRequest(Long userId, Long requesterId) {
        var myRelationship = relationshipRepository.findById_RequesterIdAndId_AddresseeId(userId, requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend request not found"));

        if (myRelationship.getStatus() != RelationshipStatus.PENDING_INCOMING) {
            throw new BadRequestException("No pending friend request from this user");
        }

        // Delete both rows
        relationshipRepository.deleteById_RequesterIdAndId_AddresseeId(userId, requesterId);
        relationshipRepository.deleteById_RequesterIdAndId_AddresseeId(requesterId, userId);

        log.info("Friend request declined: {} declined {}", userId, requesterId);
    }

    /**
     * Cancel an outgoing friend request.
     */
    @Transactional
    public void cancelFriendRequest(Long requesterId, Long addresseeId) {
        var myRelationship = relationshipRepository.findById_RequesterIdAndId_AddresseeId(requesterId, addresseeId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend request not found"));

        if (myRelationship.getStatus() != RelationshipStatus.PENDING_OUTGOING) {
            throw new BadRequestException("No outgoing friend request to this user");
        }

        // Delete both rows
        relationshipRepository.deleteById_RequesterIdAndId_AddresseeId(requesterId, addresseeId);
        relationshipRepository.deleteById_RequesterIdAndId_AddresseeId(addresseeId, requesterId);

        log.info("Friend request cancelled: {} cancelled request to {}", requesterId, addresseeId);
    }

    /**
     * Remove a friend (unfriend).
     */
    @Transactional
    public void removeFriend(Long userId, Long friendId) {
        var myRelationship = relationshipRepository.findById_RequesterIdAndId_AddresseeId(userId, friendId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend relationship not found"));

        if (myRelationship.getStatus() != RelationshipStatus.ACCEPTED) {
            throw new BadRequestException("Not friends with this user");
        }

        // Delete both rows
        relationshipRepository.deleteById_RequesterIdAndId_AddresseeId(userId, friendId);
        relationshipRepository.deleteById_RequesterIdAndId_AddresseeId(friendId, userId);

        log.info("Friendship removed between {} and {}", userId, friendId);
    }

    /**
     * Block a user.
     * Sets my row to BLOCKED and deletes their row (they lose visibility of
     * relationship).
     */
    @Transactional
    public void blockUser(Long userId, Long targetId) {
        if (userId.equals(targetId)) {
            throw new BadRequestException("Cannot block yourself");
        }

        // Fetch users
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));

        // Delete their row if exists
        relationshipRepository.deleteById_RequesterIdAndId_AddresseeId(targetId, userId);

        // Update or create my row as BLOCKED
        var myRelationship = relationshipRepository.findById_RequesterIdAndId_AddresseeId(userId, targetId)
                .orElseGet(() -> {
                    Relationship rel = Relationship.builder()
                            .id(new RelationshipId(userId, targetId))
                            .createdAt(LocalDateTime.now())
                            .build();
                    // Set User entities for JPA @MapsId
                    rel.setRequester(user);
                    rel.setAddressee(target);
                    return rel;
                });

        myRelationship.setStatus(RelationshipStatus.BLOCKED);
        myRelationship.setUpdatedAt(LocalDateTime.now());
        relationshipRepository.save(myRelationship);

        log.info("User {} blocked {}", userId, targetId);
    }

    /**
     * Unblock a user.
     */
    @Transactional
    public void unblockUser(Long userId, Long targetId) {
        var myRelationship = relationshipRepository.findById_RequesterIdAndId_AddresseeId(userId, targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Block relationship not found"));

        if (myRelationship.getStatus() != RelationshipStatus.BLOCKED) {
            throw new BadRequestException("User is not blocked");
        }

        relationshipRepository.delete(myRelationship);
        log.info("User {} unblocked {}", userId, targetId);
    }

    // ==================== Query Methods ====================

    /**
     * Check if two users are friends.
     */
    public boolean areFriends(Long userId, Long targetId) {
        return relationshipRepository.areFriends(userId, targetId);
    }

    /**
     * Check if user has blocked target OR target has blocked user.
     */
    public boolean isBlocked(Long userId, Long targetId) {
        return relationshipRepository.isBlocked(userId, targetId) ||
                relationshipRepository.isBlockedBy(userId, targetId);
    }

    /**
     * Check if target has blocked user (one-way check).
     */
    public boolean isBlockedBy(Long userId, Long targetId) {
        return relationshipRepository.isBlockedBy(userId, targetId);
    }

    /**
     * Get the relationship status from user's perspective.
     */
    public RelationshipStatus getRelationshipStatus(Long userId, Long targetId) {
        return relationshipRepository.findById_RequesterIdAndId_AddresseeId(userId, targetId)
                .map(Relationship::getStatus)
                .orElse(null);
    }

    /**
     * Record containing both blocked and friend flags for efficient checking.
     */
    public record RelationshipFlags(
            boolean isBlocked,
            boolean isBlockedBy,
            boolean isFriend) {
        public static RelationshipFlags none() {
            return new RelationshipFlags(false, false, false);
        }
    }

    /**
     * Get combined relationship flags in optimized queries.
     * Use this instead of separate areFriends() and isBlockedBy() calls.
     *
     * @param userId   The user making the request
     * @param targetId The target user
     * @return RelationshipFlags with blocked and friend status
     */
    public RelationshipFlags getRelationshipFlags(Long userId, Long targetId) {
        // Get user's view of the relationship
        var myStatus = relationshipRepository.findStatusByUserIds(userId, targetId);
        // Get target's view (to check if they blocked us)
        var theirStatus = relationshipRepository.findReverseStatusByUserIds(userId, targetId);

        boolean isBlocked = myStatus.map(s -> s == RelationshipStatus.BLOCKED).orElse(false);
        boolean isFriend = myStatus.map(s -> s == RelationshipStatus.ACCEPTED).orElse(false);
        boolean isBlockedBy = theirStatus.map(s -> s == RelationshipStatus.BLOCKED).orElse(false);

        return new RelationshipFlags(isBlocked, isBlockedBy, isFriend);
    }

    /**
     * Get friends list.
     */
    public Slice<Relationship> getFriends(Long userId, Pageable pageable) {
        return relationshipRepository.findFriends(userId, pageable);
    }

    /**
     * Get incoming friend requests.
     */
    public Slice<Relationship> getIncomingRequests(Long userId, Pageable pageable) {
        return relationshipRepository.findIncomingRequests(userId, pageable);
    }

    /**
     * Get outgoing friend requests.
     */
    public Slice<Relationship> getOutgoingRequests(Long userId, Pageable pageable) {
        return relationshipRepository.findOutgoingRequests(userId, pageable);
    }

    /**
     * Count friends.
     */
    public long countFriends(Long userId) {
        return relationshipRepository.countFriends(userId);
    }

    /**
     * Count pending incoming requests.
     */
    public long countPendingRequests(Long userId) {
        return relationshipRepository.countPendingIncoming(userId);
    }

    // ==================== Helper Methods ====================

    /**
     * When two users become friends, upgrade their existing DIRECT conversation
     * participants from REQUEST to INBOX.
     */
    private void upgradeExistingConversationToInbox(Long user1Id, Long user2Id) {
        // Find DIRECT conversation between these users
        String directKey = generateDirectKey(user1Id, user2Id);
        var conversation = conversationRepository.findByDirectKey(directKey);

        if (conversation.isPresent()) {
            // Upgrade both participants to INBOX
            var participants = participantRepository.findByConversationId(conversation.get().getId());
            for (Participant p : participants) {
                if (p.getStatus() == ParticipantStatus.REQUEST) {
                    p.setStatus(ParticipantStatus.INBOX);
                    participantRepository.save(p);
                    log.info("Upgraded participant {} to INBOX in conversation {}",
                            p.getUser().getId(), conversation.get().getId());
                }
            }
        }
    }

    /**
     * Generate the directKey for a DIRECT conversation.
     */
    private String generateDirectKey(Long user1Id, Long user2Id) {
        long minId = Math.min(user1Id, user2Id);
        long maxId = Math.max(user1Id, user2Id);
        return minId + ":" + maxId;
    }
}
