/**
 * useUserQueueSubscription hook
 * Subscribe to user-specific WebSocket queues for chat events
 */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { queryKeys } from '@/config/queryKeys';
import type { AckEvent, ChatMessageEvent, ConversationUpgradedEvent } from '@/lib/websocket';
import { websocketService } from '@/lib/websocket';
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

/**
 * Subscribe to user-specific WebSocket queues:
 * - /user/queue/ack - Message delivery confirmations
 * - /user/queue/messages - Incoming messages
 * - /user/queue/events - Conversation upgrades
 */
export function useUserQueueSubscription() {
    const queryClient = useQueryClient();
    const subscriptionsRef = useRef<boolean>(false);

    const { handleAck, addMessageRequest, setParticipantStatus } = useChatStore.getState();

    /**
     * Handle ACK events from server
     */
    const onAck = useCallback((ack: AckEvent) => {
        console.log('[UserQueue] ACK received:', ack);
        handleAck(ack);
    }, [handleAck]);

    /**
     * Handle incoming chat message events
     */
    const onMessage = useCallback((event: ChatMessageEvent) => {
        console.log('[UserQueue] Message received:', event);

        // If this is a message request (from non-friend), add to message requests
        if (event.isRequest) {
            addMessageRequest(event);
        }

        // Add message to React Query cache
        const queryKey = queryKeys.messages.list(event.conversationId, {});

        // Convert ChatMessageEvent to MessageResponse format
        const messageResponse: MessageResponse = {
            id: event.id,
            senderId: event.senderId,
            senderName: event.senderName,
            senderAvatarUrl: event.senderAvatarUrl,
            content: event.content,
            messageType: event.messageType,
            readBy: [],
            isActive: true,
            conversationId: event.conversationId,
            replyToId: event.replyToId,
            timestamp: event.timestamp,
        };

        queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
            if (!oldData?.pages?.length) {
                // No existing data - invalidate to trigger refetch
                return undefined;
            }

            // Check if message already exists (deduplication)
            const allMessages = oldData.pages.flatMap((p) => p.content);
            if (allMessages.some((m) => m.id === event.id)) {
                return oldData;
            }

            // Prepend to first page
            const newPages = [...oldData.pages];
            newPages[0] = {
                ...newPages[0],
                content: [messageResponse, ...newPages[0].content],
                numberOfElements: newPages[0].numberOfElements + 1,
            };

            return { ...oldData, pages: newPages };
        });

        // If no existing data, invalidate to trigger fresh fetch
        const existingData = queryClient.getQueryData<InfiniteMessagesData>(queryKey);
        if (!existingData) {
            queryClient.invalidateQueries({ queryKey });
        }

        // Invalidate conversations list to update last message preview
        if (event.isNewConversation) {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        }
    }, [queryClient, addMessageRequest]);

    /**
     * Handle conversation upgrade events (REQUEST -> INBOX)
     */
    const onConversationEvent = useCallback((event: ConversationUpgradedEvent) => {
        console.log('[UserQueue] Conversation upgraded:', event);
        setParticipantStatus(event.conversationId, event.newStatus);

        // Invalidate conversations list to reflect new status
        queryClient.invalidateQueries({
            queryKey: queryKeys.conversations.all,
        });
    }, [queryClient, setParticipantStatus]);

    useEffect(() => {
        if (!websocketService.isConnected() || subscriptionsRef.current) {
            return;
        }

        // Subscribe to all user queues
        websocketService.subscribeToAllUserQueues({
            onAck,
            onMessage,
            onConversationEvent,
        });

        subscriptionsRef.current = true;

        return () => {
            websocketService.unsubscribeFromUserQueues();
            subscriptionsRef.current = false;
        };
    }, [onAck, onMessage, onConversationEvent]);

    return {
        isSubscribed: subscriptionsRef.current,
    };
}

/**
 * Hook to auto-subscribe to user queues when WebSocket connects
 * Use this at the app level (e.g., in WebSocketProvider)
 */
export function useAutoUserQueueSubscription() {
    const socketStatus = useChatStore((state) => state.socketStatus);
    const { isSubscribed } = useUserQueueSubscription();

    // Re-subscribe when socket reconnects
    useEffect(() => {
        if (socketStatus === 'connected' && !isSubscribed) {
            // Force re-subscribe - the hook will handle it
        }
    }, [socketStatus, isSubscribed]);

    return {
        isSubscribed,
        isConnected: socketStatus === 'connected',
    };
}
