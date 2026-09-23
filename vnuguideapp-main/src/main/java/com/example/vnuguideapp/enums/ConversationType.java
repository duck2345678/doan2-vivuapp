package com.example.vnuguideapp.enums;

/**
 * Type of conversation.
 * - DIRECT: One-to-one private message between two users
 * - CHANNEL: Group conversation/channel with multiple participants
 * - YOURSELF: Self-conversation (notes to self)
 */
public enum ConversationType {
    CHANNEL,
    DIRECT, // Renamed from PRIVATE for consistency with messaging standards
    YOURSELF
}
