/**
 * useSendMessageViaWebSocket hook
 * Send messages via WebSocket with optimistic updates and ACK handling
 */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { queryKeys } from '@/config/queryKeys';
import { MessageType } from '@/lib/api/generated';
import { websocketService, WebSocketService } from '@/lib/websocket';
import type { MessageResponse } from '@/shared/types/backend.types';
import type { Slice } from '@/shared/types/pagination.types';
import { useChatStore } from '../store';

/**
 * Infinite query data structure for messages
 */
interface InfiniteMessagesData {
    pages: Slice<MessageResponse>[];
    pageParams: number[];
}

interface SendMessageInput {
    recipientId: number;
    content: string;
    replyToId?: number;
    /** Sender info for optimistic message display */
    senderInfo: {
        id: number;
        displayName: string;
        avatarUrl?: string;
    };
    /** Conversation ID (if known) for optimistic updates */
    conversationId?: string;
}

/**
 * Optimistic message with client tracking
 */
interface OptimisticWSMessage extends MessageResponse {
    _clientMessageId: string;
    _isOptimistic: boolean;
    _status: 'sending' | 'sent' | 'error';
    _error?: string;
}

/**
 * Hook for sending messages via WebSocket with optimistic UI
 * - Generates clientMessageId for idempotency
 * - Tracks pending messages in chat store
 * - Updates UI optimistically before ACK
 */
export function useSendMessageViaWebSocket() {
    const queryClient = useQueryClient();
    const { addPendingMessage, handleAck } = useChatStore.getState();

    /**
     * Send message via WebSocket
     */
    const sendMessage = useCallback((input: SendMessageInput) => {
        // Generate unique client message ID
        const clientMessageId = WebSocketService.generateClientMessageId();

        // Add to pending messages store
        addPendingMessage({
            clientMessageId,
            recipientId: input.recipientId,
            conversationId: input.conversationId,
            content: input.content,
            replyToId: input.replyToId,
        });

        // Create optimistic message for immediate UI update
        if (input.conversationId) {
            const queryKey = queryKeys.messages.list(input.conversationId, {});

            const optimisticMessage: OptimisticWSMessage = {
                id: -Date.now(), // Negative ID to avoid collision
                _clientMessageId: clientMessageId,
                _isOptimistic: true,
                _status: 'sending',
                senderId: input.senderInfo.id,
                senderName: input.senderInfo.displayName,
                senderAvatarUrl: input.senderInfo.avatarUrl,
                content: input.content,
                messageType: MessageType.TEXT,
                readBy: [],
                isActive: true,
                conversationId: input.conversationId,
                replyToId: input.replyToId,
                timestamp: new Date().toISOString(),
            };

            // Add optimistic message to cache
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) {
                    return oldData;
                }

                const newPages = [...oldData.pages];
                newPages[0] = {
                    ...newPages[0],
                    content: [optimisticMessage as unknown as MessageResponse, ...newPages[0].content],
                    numberOfElements: newPages[0].numberOfElements + 1,
                };

                return { ...oldData, pages: newPages };
            });
        }

        const receiptId = `msg-${clientMessageId}`;
        websocketService.watchForReceipt(receiptId, () => {
            handleAck({
                clientMessageId,
                status: 'DELIVERED',
                conversationId: input.conversationId,
            });
        });

        // Send via WebSocket
        websocketService.sendChatMessage({
            recipientId: input.recipientId,
            content: input.content,
            clientMessageId,
            replyToId: input.replyToId,
        }, { receiptId });

        return clientMessageId;
    }, [queryClient, addPendingMessage, handleAck]);

    /**
     * Check if WebSocket is connected
     */
    const canSend = useMemo(() => {
        return websocketService.isConnected();
    }, []);

    return {
        sendMessage,
        canSend,
        generateClientMessageId: WebSocketService.generateClientMessageId,
    };
}
