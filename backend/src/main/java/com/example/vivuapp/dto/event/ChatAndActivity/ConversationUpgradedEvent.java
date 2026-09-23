package com.example.vivuapp.dto.event.ChatAndActivity;

import com.example.vivuapp.enums.ParticipantStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Event sent when a conversation is upgraded from REQUEST to INBOX.
 * This happens when:
 * 1. User accepts a message request
 * 2. Users become friends (auto-upgrade existing conversations)
 * 
 * Sent to /user/queue/events destination.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConversationUpgradedEvent {

    /**
     * The conversation ID that was upgraded.
     */
    String conversationId;

    /**
     * The new status of the participant.
     */
    ParticipantStatus newStatus;

    /**
     * The other user's ID in this DIRECT conversation.
     */
    Long otherUserId;

    /**
     * The other user's display name.
     */
    String otherUserName;

    /**
     * Reason for the upgrade.
     */
    UpgradeReason reason;

    public enum UpgradeReason {
        /**
         * User accepted the message request.
         */
        MESSAGE_REQUEST_ACCEPTED,

        /**
         * Users became friends.
         */
        BECAME_FRIENDS
    }
}
