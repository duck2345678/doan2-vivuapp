package com.example.vivuapp.enums;

/**
 * Status of a relationship between two users.
 * Uses a two-row model where each user has their own relationship record.
 */
public enum RelationshipStatus {
    /**
     * No relationship exists between users
     */
    NONE,

    /**
     * The requester has sent a friend request (outgoing perspective)
     */
    PENDING_OUTGOING,

    /**
     * The addressee has received a friend request (incoming perspective)
     */
    PENDING_INCOMING,

    /**
     * Both users are friends (mutual)
     */
    ACCEPTED,

    /**
     * This user has blocked the other user
     */
    BLOCKED,

    /**
     * Restricted relationship (limited visibility)
     */
    RESTRICTED
}
