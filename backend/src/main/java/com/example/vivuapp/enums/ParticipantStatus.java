package com.example.vivuapp.enums;

/**
 * Status of a participant in a conversation.
 * Determines whether messages appear in INBOX or REQUEST folder.
 */
public enum ParticipantStatus {
    /**
     * Normal inbox - messages from friends appear here
     */
    INBOX,

    /**
     * Message requests - messages from non-friends appear here
     */
    REQUEST,

    /**
     * Archived conversation - hidden but not deleted
     */
    ARCHIVED,

    /**
     * Soft-deleted from user's view
     */
    DELETED
}
