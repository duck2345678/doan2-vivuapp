package com.example.vivuapp.dto.event.ChatAndActivity;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Acknowledgment event sent to sender after message is processed.
 * Sent to /user/queue/ack destination.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AckEvent {

    /**
     * The client-generated message ID that was acknowledged.
     */
    String clientMessageId;

    /**
     * The server-generated real message ID.
     */
    Long realMessageId;

    /**
     * The conversation ID where message was saved.
     */
    String conversationId;

    /**
     * Status of the message processing.
     */
    AckStatus status;

    /**
     * Error message if status is ERROR.
     */
    String errorMessage;

    public enum AckStatus {
        /**
         * New message successfully created and delivered.
         */
        DELIVERED,

        /**
         * Duplicate clientMessageId - message already exists (idempotent).
         */
        DUPLICATE,

        /**
         * Error occurred during processing.
         */
        ERROR,

        /**
         * Message blocked due to relationship status.
         */
        BLOCKED
    }
}
