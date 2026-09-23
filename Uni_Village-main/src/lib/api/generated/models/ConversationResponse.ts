/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ConversationResponse = {
    id?: string;
    name?: string;
    avatarUrl?: string;
    unreadCount?: number;
    lastMessage?: string;
    lastMessageTime?: string;
    otherUserId?: number;
    participantStatus?: 'INBOX' | 'REQUEST' | 'ARCHIVED' | 'DELETED';
    relationshipStatus?: 'NONE' | 'PENDING_OUTGOING' | 'PENDING_INCOMING' | 'ACCEPTED' | 'BLOCKED' | 'BLOCKED_BY';
};

