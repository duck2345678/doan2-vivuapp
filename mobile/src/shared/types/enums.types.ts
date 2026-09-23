/**
 * Enums
 * All backend enum types from VNU Guide API
 */

// ============================================
// Place Enums
// ============================================

export enum PlaceStatus {
    ACTIVE = 'ACTIVE',
    TEMP_CLOSED = 'TEMP_CLOSED',
    CLOSED = 'CLOSED',
}

export enum PlaceSuggestionStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

// ============================================
// Tour Enums
// ============================================

export enum TourStatus {
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

// ============================================
// Post Enums
// ============================================

export enum PostType {
    EXPERIENCE = 'EXPERIENCE',
    ITINERARY = 'ITINERARY',
    GROUP_INVITE = 'GROUP_INVITE',
    TOUR = 'TOUR',
    TOUR_SHARE = 'TOUR_SHARE',
}

export enum Visibility {
    PUBLIC = 'PUBLIC',
    FRIENDS = 'FRIENDS',
    PRIVATE = 'PRIVATE',
}

// ============================================
// Channel & Conversation Enums
// ============================================

export enum ChannelPrivacy {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
}

export enum ChannelType {
    TEXT = 'TEXT',
    VOICE = 'VOICE',
    VIDEO = 'VIDEO',
    ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum ParticipantRole {
    ADMIN = 'ADMIN',
    MEMBER = 'MEMBER',
}

export enum ConversationType {
    CHANNEL = 'CHANNEL',
    PRIVATE = 'PRIVATE',
    YOURSELF = 'YOURSELF',
}

export enum JoinRequestStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
}

// ============================================
// Message Enums
// ============================================

export enum MessageType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    AUDIO = 'AUDIO',
    DOCUMENT = 'DOCUMENT',
    SHARED_POST = 'SHARED_POST',
    SYSTEM = 'SYSTEM',
}

export enum FileType {
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    AUDIO = 'AUDIO',
    DOCUMENT = 'DOCUMENT',
}

// ============================================
// WebSocket Event Types
// ============================================

export enum WebSocketEventType {
    SEND = 'SEND',
    EDIT = 'EDIT',
    UNSEND = 'UNSEND',
    SEEN = 'SEEN',
    DELIVERED = 'DELIVERED',
    TYPING = 'TYPING',
    CHANNEL_CHANGED = 'CHANNEL_CHANGED',
    COMMENT_CHANGED = 'COMMENT_CHANGED',
    REACTION_CHANGED = 'REACTION_CHANGED',
    POST_CHANGED = 'POST_CHANGED',
    SEND_JOIN_REQUEST = 'SEND_JOIN_REQUEST',
    ACCEPT_JOIN_REQUEST = 'ACCEPT_JOIN_REQUEST',
    REJECT_JOIN_REQUEST = 'REJECT_JOIN_REQUEST',
}
