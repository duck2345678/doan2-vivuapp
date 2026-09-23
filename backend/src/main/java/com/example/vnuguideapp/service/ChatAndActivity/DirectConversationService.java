package com.example.vnuguideapp.service.ChatAndActivity;

import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.ChatAndActivity.Conversation;
import com.example.vnuguideapp.entity.ChatAndActivity.Participant;
import com.example.vnuguideapp.enums.ConversationType;
import com.example.vnuguideapp.enums.ParticipantRole;
import com.example.vnuguideapp.enums.ParticipantStatus;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ConversationRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ParticipantRepository;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Service for managing DIRECT (1:1) conversations.
 * Handles creation and lookup using the directKey pattern.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class DirectConversationService {

    ConversationRepository conversationRepository;
    ParticipantRepository participantRepository;
    UserRepository userRepository;

    /**
     * Get or create a DIRECT conversation between two users.
     * Uses directKey to ensure only one conversation exists between any two users.
     *
     * @param user1Id    First user ID
     * @param user2Id    Second user ID
     * @param areFriends Whether the users are friends (affects participant status)
     * @return The existing or newly created conversation
     */
    @Transactional
    public Conversation getOrCreate(Long user1Id, Long user2Id, boolean areFriends) {
        // Generate the directKey
        String directKey = generateDirectKey(user1Id, user2Id);

        // Try to find existing conversation (with optimized query)
        var existing = conversationRepository.findByDirectKeyWithLastMessage(directKey);
        if (existing.isPresent()) {
            Conversation conv = existing.get();
            log.debug("Found existing DIRECT conversation with key: {}", directKey);

            // Check if the initiating user's participant was marked as DELETED
            var myParticipant = participantRepository.findByConversationIdAndUserId(conv.getId(), user1Id);

            if (myParticipant.isPresent()) {
                Participant p = myParticipant.get();
                if (p.getStatus() == ParticipantStatus.DELETED) {
                    // Re-activate: User previously deleted but now wants to message again
                    p.setStatus(areFriends ? ParticipantStatus.INBOX : ParticipantStatus.REQUEST);
                    p.setUnreadCount(0);
                    p.setDeletedAt(null); // Clear deletion timestamp
                    participantRepository.save(p);
                    log.info("Re-activated participant {} in conversation {}", user1Id, conv.getId());
                }
                return conv;
            } else {
                // Participant record was fully removed (shouldn't happen with soft-delete)
                // Add them back as a new participant
                User user1 = userRepository.findById(user1Id)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found: " + user1Id));

                Participant newParticipant = Participant.builder()
                        .conversation(conv)
                        .user(user1)
                        .role(ParticipantRole.MEMBER)
                        .status(areFriends ? ParticipantStatus.INBOX : ParticipantStatus.REQUEST)
                        .unreadCount(0)
                        .build();
                participantRepository.save(newParticipant);
                log.info("Re-added participant {} to conversation {}", user1Id, conv.getId());
                return conv;
            }
        }

        // Create new conversation
        log.info("Creating new DIRECT conversation between {} and {} (areFriends={})",
                user1Id, user2Id, areFriends);

        // Fetch users
        User user1 = userRepository.findById(user1Id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + user1Id));
        User user2 = userRepository.findById(user2Id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + user2Id));

        // Create conversation
        Conversation conversation = Conversation.builder()
                .type(ConversationType.DIRECT)
                .directKey(directKey)
                .build();

        Conversation savedConversation = conversationRepository.save(conversation);

        // Create participants with appropriate status
        List<Participant> participants = new ArrayList<>();

        // User1 is the initiator - always INBOX
        participants.add(Participant.builder()
                .conversation(savedConversation)
                .user(user1)
                .role(ParticipantRole.MEMBER)
                .status(ParticipantStatus.INBOX)
                .unreadCount(0)
                .build());

        // User2 status depends on friendship
        // If friends: INBOX (normal inbox)
        // If not friends: REQUEST (message requests folder)
        participants.add(Participant.builder()
                .conversation(savedConversation)
                .user(user2)
                .role(ParticipantRole.MEMBER)
                .status(areFriends ? ParticipantStatus.INBOX : ParticipantStatus.REQUEST)
                .unreadCount(0)
                .build());

        participantRepository.saveAll(participants);

        log.info("Created DIRECT conversation {} with directKey {}",
                savedConversation.getId(), directKey);

        return savedConversation;
    }

    /**
     * Find an existing DIRECT conversation by the two user IDs.
     */
    public Conversation findByUsers(Long user1Id, Long user2Id) {
        String directKey = generateDirectKey(user1Id, user2Id);
        return conversationRepository.findByDirectKey(directKey)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No conversation found between users " + user1Id + " and " + user2Id));
    }

    /**
     * Check if a DIRECT conversation exists between two users.
     */
    public boolean exists(Long user1Id, Long user2Id) {
        String directKey = generateDirectKey(user1Id, user2Id);
        return conversationRepository.findByDirectKey(directKey).isPresent();
    }

    /**
     * Generate the directKey for a DIRECT conversation.
     * Format: "LEAST(id1,id2):GREATEST(id1,id2)"
     * This ensures the same key is generated regardless of which user initiates.
     */
    public String generateDirectKey(Long user1Id, Long user2Id) {
        long minId = Math.min(user1Id, user2Id);
        long maxId = Math.max(user1Id, user2Id);
        return minId + ":" + maxId;
    }

    /**
     * Get or create a DIRECT conversation for messaging.
     * This is a convenience method that determines friendship status internally.
     *
     * @param senderId    The user initiating the conversation
     * @param recipientId The recipient user
     * @param areFriends  Whether the users are friends
     * @return The conversation
     */
    @Transactional
    public Conversation getOrCreateForMessage(Long senderId, Long recipientId, boolean areFriends) {
        Conversation conversation = getOrCreate(senderId, recipientId, areFriends);

        // If creating for a message from non-friend, ensure sender's status is INBOX
        // and recipient's status is REQUEST (if not already set correctly)
        if (!areFriends) {
            var senderParticipant = participantRepository
                    .findByConversationIdAndUserId(conversation.getId(), senderId);
            var recipientParticipant = participantRepository
                    .findByConversationIdAndUserId(conversation.getId(), recipientId);

            // Sender should always be INBOX (they initiated)
            senderParticipant.ifPresent(p -> {
                if (p.getStatus() != ParticipantStatus.INBOX) {
                    p.setStatus(ParticipantStatus.INBOX);
                    participantRepository.save(p);
                }
            });

            // Recipient should be REQUEST if not friends (unless already INBOX from prior
            // friendship)
            recipientParticipant.ifPresent(p -> {
                // Only downgrade to REQUEST if not already INBOX
                // (user might have accepted the request before)
                if (p.getStatus() == ParticipantStatus.REQUEST) {
                    // Already correct, do nothing
                }
            });
        }

        return conversation;
    }
}
