/**
 * Chat Store
 * Zustand store for real-time chat state management
 */

import type { AckEvent, ChatMessageEvent, ParticipantStatus } from '@/lib/websocket';
import { create } from 'zustand';

/**
 * Socket connection status
 */
export type SocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * Typing user info with timestamp for cleanup
 */
export interface TypingUserInfo {
    userId: number;
    userName: string;
    timestamp: number;
}

/**
 * Pending message waiting for ACK
 */
export interface PendingMessage {
    clientMessageId: string;
    recipientId: number;
    conversationId?: string;
    content: string;
    replyToId?: number;
    timestamp: number;
    status: 'sending' | 'sent' | 'error';
    errorMessage?: string;
}

/**
 * Message request preview (for incoming messages from non-friends)
 */
export interface MessageRequestPreview {
    conversationId: string;
    senderId: number;
    senderName: string;
    senderAvatarUrl?: string;
    lastMessagePreview: string;
    unreadCount: number;
    lastMessageTime: string;
}

interface ChatState {
    /** Currently active conversation ID */
    activeConversationId: string | null;
    /** Map of typing users by userId */
    typingUsers: Map<number, TypingUserInfo>;
    /** WebSocket connection status */
    socketStatus: SocketStatus;
    /** Last socket error message */
    lastError: string | null;
    /** Pending messages waiting for ACK (keyed by clientMessageId) */
    pendingMessages: Map<string, PendingMessage>;
    /** Message requests from non-friends (keyed by conversationId) */
    messageRequests: Map<string, MessageRequestPreview>;
    /** Participant status in conversations (keyed by conversationId) */
    participantStatuses: Map<string, ParticipantStatus>;
}

interface ChatActions {
    /** Set the active conversation */
    setActiveConversation: (conversationId: string | null) => void;
    /** Update typing status for a user */
    setTypingUser: (userId: number, userName: string, isTyping: boolean) => void;
    /** Clear all typing users (e.g., when switching conversations) */
    clearTypingUsers: () => void;
    /** Update socket connection status */
    setSocketStatus: (status: SocketStatus, error?: string) => void;
    /** Add a pending message */
    addPendingMessage: (message: Omit<PendingMessage, 'timestamp' | 'status'>) => void;
    /** Update pending message status on ACK */
    handleAck: (ack: AckEvent) => void;
    /** Add or update a message request */
    addMessageRequest: (event: ChatMessageEvent) => void;
    /** Remove a message request (e.g., after accepting) */
    removeMessageRequest: (conversationId: string) => void;
    /** Update participant status for a conversation */
    setParticipantStatus: (conversationId: string, status: ParticipantStatus) => void;
    /** Get unread message request count */
    getMessageRequestCount: () => number;
    /** Clear all state for a specific conversation (used after deletion) */
    clearConversationState: (conversationId: string) => void;
    /** Reset store to initial state */
    reset: () => void;
}

type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
    activeConversationId: null,
    typingUsers: new Map(),
    socketStatus: 'disconnected',
    lastError: null,
    pendingMessages: new Map(),
    messageRequests: new Map(),
    participantStatuses: new Map(),
};

export const useChatStore = create<ChatStore>((set, get) => ({
    ...initialState,

    setActiveConversation: (conversationId) => {
        set({
            activeConversationId: conversationId,
            // Clear typing users when switching conversations
            typingUsers: new Map(),
        });
    },

    setTypingUser: (userId, userName, isTyping) => {
        set((state) => {
            const newTypingUsers = new Map(state.typingUsers);

            if (isTyping) {
                newTypingUsers.set(userId, {
                    userId,
                    userName,
                    timestamp: Date.now(),
                });
            } else {
                newTypingUsers.delete(userId);
            }

            return { typingUsers: newTypingUsers };
        });
    },

    clearTypingUsers: () => {
        set({ typingUsers: new Map() });
    },

    setSocketStatus: (status, error) => {
        set({
            socketStatus: status,
            lastError: error ?? null,
        });
    },

    addPendingMessage: (message) => {
        set((state) => {
            const newPendingMessages = new Map(state.pendingMessages);
            newPendingMessages.set(message.clientMessageId, {
                ...message,
                timestamp: Date.now(),
                status: 'sending',
            });
            return { pendingMessages: newPendingMessages };
        });
    },

    handleAck: (ack) => {
        set((state) => {
            const newPendingMessages = new Map(state.pendingMessages);
            const pending = newPendingMessages.get(ack.clientMessageId);

            if (pending) {
                if (ack.status === 'DELIVERED' || ack.status === 'DUPLICATE') {
                    // Message delivered successfully - remove from pending
                    newPendingMessages.delete(ack.clientMessageId);
                } else {
                    // Error or blocked - update status
                    newPendingMessages.set(ack.clientMessageId, {
                        ...pending,
                        status: 'error',
                        errorMessage: ack.errorMessage,
                    });
                }
            }

            // Update participant status if conversationId is provided
            const newParticipantStatuses = new Map(state.participantStatuses);
            if (ack.conversationId && !newParticipantStatuses.has(ack.conversationId)) {
                newParticipantStatuses.set(ack.conversationId, 'INBOX');
            }

            return {
                pendingMessages: newPendingMessages,
                participantStatuses: newParticipantStatuses,
            };
        });
    },

    addMessageRequest: (event) => {
        set((state) => {
            const newMessageRequests = new Map(state.messageRequests);
            const existing = newMessageRequests.get(event.conversationId);

            newMessageRequests.set(event.conversationId, {
                conversationId: event.conversationId,
                senderId: event.senderId,
                senderName: event.senderName,
                senderAvatarUrl: event.senderAvatarUrl,
                lastMessagePreview: event.content.substring(0, 100),
                unreadCount: (existing?.unreadCount ?? 0) + 1,
                lastMessageTime: event.timestamp,
            });

            // Update participant status
            const newParticipantStatuses = new Map(state.participantStatuses);
            newParticipantStatuses.set(event.conversationId, 'REQUEST');

            return {
                messageRequests: newMessageRequests,
                participantStatuses: newParticipantStatuses,
            };
        });
    },

    removeMessageRequest: (conversationId) => {
        set((state) => {
            const newMessageRequests = new Map(state.messageRequests);
            newMessageRequests.delete(conversationId);

            const newParticipantStatuses = new Map(state.participantStatuses);
            newParticipantStatuses.set(conversationId, 'INBOX');

            return {
                messageRequests: newMessageRequests,
                participantStatuses: newParticipantStatuses,
            };
        });
    },

    setParticipantStatus: (conversationId, status) => {
        set((state) => {
            const newParticipantStatuses = new Map(state.participantStatuses);
            newParticipantStatuses.set(conversationId, status);

            // If upgraded to INBOX, remove from message requests
            const newMessageRequests = new Map(state.messageRequests);
            if (status === 'INBOX') {
                newMessageRequests.delete(conversationId);
            }

            return {
                participantStatuses: newParticipantStatuses,
                messageRequests: newMessageRequests,
            };
        });
    },

    getMessageRequestCount: () => {
        return get().messageRequests.size;
    },

    clearConversationState: (conversationId) => {
        set((state) => {
            // Clear message requests for this conversation
            const newMessageRequests = new Map(state.messageRequests);
            newMessageRequests.delete(conversationId);

            // Clear participant status
            const newParticipantStatuses = new Map(state.participantStatuses);
            newParticipantStatuses.delete(conversationId);

            // Clear typing users (they're keyed by userId, but clear all when conversation is deleted)
            const newTypingUsers = new Map(state.typingUsers);

            // Clear active conversation if it's the deleted one
            const newActiveId =
                state.activeConversationId === conversationId ? null : state.activeConversationId;

            return {
                messageRequests: newMessageRequests,
                participantStatuses: newParticipantStatuses,
                typingUsers: newTypingUsers,
                activeConversationId: newActiveId,
            };
        });
    },

    reset: () => {
        set(initialState);
    },
}));

/**
 * Selector hooks for optimized renders
 */
export const useActiveConversationId = () =>
    useChatStore((state) => state.activeConversationId);

export const useSocketStatus = () =>
    useChatStore((state) => state.socketStatus);

export const useTypingUsersList = () =>
    useChatStore((state) => Array.from(state.typingUsers.values()));

export const useIsAnyoneTyping = () =>
    useChatStore((state) => state.typingUsers.size > 0);

export const usePendingMessages = () =>
    useChatStore((state) => Array.from(state.pendingMessages.values()));

export const useMessageRequests = () =>
    useChatStore((state) => Array.from(state.messageRequests.values()));

export const useMessageRequestCount = () =>
    useChatStore((state) => state.messageRequests.size);

export const useParticipantStatus = (conversationId: string) =>
    useChatStore((state) => state.participantStatuses.get(conversationId) ?? 'INBOX');

