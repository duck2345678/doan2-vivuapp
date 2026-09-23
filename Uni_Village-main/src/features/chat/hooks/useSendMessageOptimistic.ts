/**
 * useSendMessageOptimistic hook
 * Send message with optimistic UI updates using real API
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { queryKeys } from '@/config/queryKeys';
import type { MessageRequest, MessageResponse } from '@/shared/types/backend.types';
import type { Slice } from '@/shared/types/pagination.types';
import { messagesApi } from '../api';

/**
 * Optimistic message structure - includes clientId for tracking
 */
export interface OptimisticMessage extends MessageResponse {
    /** Client-side generated ID for tracking optimistic updates */
    _clientId: string;
    /** Whether this is an optimistic (not yet confirmed) message */
    _isOptimistic: boolean;
    /** Optimistic status: 'sending' | 'sent' | 'error' */
    _status: 'sending' | 'sent' | 'error';
    /** Error message if status is 'error' */
    _error?: string;
}

/**
 * Infinite query data structure for messages
 */
interface InfiniteMessagesData {
    pages: Slice<MessageResponse>[];
    pageParams: number[];
}

/**
 * Generate unique client-side message ID
 */
function generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an optimistic message before API response
 */
function createOptimisticMessage(
    content: string,
    conversationId: string,
    senderId: number,
    senderName: string,
    senderAvatarUrl?: string,
    replyToId?: number
): OptimisticMessage {
    return {
        id: -Date.now(), // Negative ID to avoid collision with real messages
        _clientId: generateClientId(),
        _isOptimistic: true,
        _status: 'sending',
        senderId,
        conversationId,
        senderName,
        senderAvatarUrl: senderAvatarUrl || null,
        content,
        messageType: 'TEXT',
        readBy: [],
        isActive: true,
        replyToId: replyToId || null,
        timestamp: new Date().toISOString(),
    } as OptimisticMessage;
}

interface SendMessageInput {
    content: string;
    conversationId: string;
    replyToId?: number;
    /** Current user info for optimistic message display */
    senderInfo: {
        id: number;
        displayName: string;
        avatarUrl?: string;
    };
}

/**
 * Hook for sending messages with optimistic UI
 * - Shows message immediately in UI with 'sending' status
 * - Updates to 'sent' on API success with real message ID
 * - Shows 'error' status on failure with retry option
 */
export function useSendMessageOptimistic() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (input: SendMessageInput) => {
            const request: MessageRequest = {
                content: input.content,
                ConversationId: input.conversationId,
                replyToId: input.replyToId,
            };
            const response = await messagesApi.sendMessage(request);
            return response.result;
        },

        onMutate: async (variables) => {
            const queryKey = queryKeys.messages.list(variables.conversationId, {});

            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey });

            // Snapshot previous data
            const previousData = queryClient.getQueryData<InfiniteMessagesData>(queryKey);

            // Create optimistic message
            const optimisticMessage = createOptimisticMessage(
                variables.content,
                variables.conversationId,
                variables.senderInfo.id,
                variables.senderInfo.displayName,
                variables.senderInfo.avatarUrl,
                variables.replyToId
            );

            // Optimistically update cache - prepend to first page
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

            // Invalidate conversations list to update last message preview
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });

            return { previousData, optimisticMessage };
        },

        onSuccess: (realMessage, variables, context) => {
            const queryKey = queryKeys.messages.list(variables.conversationId, {});

            // Replace optimistic message with real one
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) return oldData;

                const newPages = oldData.pages.map((page) => ({
                    ...page,
                    content: page.content.map((msg) => {
                        const optimistic = msg as unknown as OptimisticMessage;
                        if (optimistic._clientId === context?.optimisticMessage._clientId) {
                            return realMessage;
                        }
                        return msg;
                    }),
                }));

                return { ...oldData, pages: newPages };
            });
        },

        onError: (_error, variables, context) => {
            const queryKey = queryKeys.messages.list(variables.conversationId, {});

            // Update optimistic message to show error state
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) return oldData;

                const newPages = oldData.pages.map((page) => ({
                    ...page,
                    content: page.content.map((msg) => {
                        const optimistic = msg as unknown as OptimisticMessage;
                        if (optimistic._clientId === context?.optimisticMessage._clientId) {
                            return {
                                ...msg,
                                _status: 'error',
                                _error: 'Không thể gửi tin nhắn. Nhấn để thử lại.',
                            } as unknown as MessageResponse;
                        }
                        return msg;
                    }),
                }));

                return { ...oldData, pages: newPages };
            });
        },
    });

    /**
     * Retry sending a failed message
     */
    const retry = useCallback(
        (failedMessage: OptimisticMessage, conversationId: string, senderInfo: SendMessageInput['senderInfo']) => {
            // Remove the failed message first
            const queryKey = queryKeys.messages.list(conversationId, {});
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) return oldData;

                const newPages = oldData.pages.map((page) => ({
                    ...page,
                    content: page.content.filter((msg) => {
                        const optimistic = msg as unknown as OptimisticMessage;
                        return optimistic._clientId !== failedMessage._clientId;
                    }),
                }));

                return { ...oldData, pages: newPages };
            });

            // Re-send
            mutation.mutate({
                content: failedMessage.content || '',
                conversationId,
                replyToId: failedMessage.replyToId || undefined,
                senderInfo,
            });
        },
        [mutation, queryClient]
    );

    /**
     * Check if a message is optimistic
     */
    const isOptimisticMessage = useCallback((message: MessageResponse): message is OptimisticMessage => {
        return !!(message as OptimisticMessage)._isOptimistic;
    }, []);

    return useMemo(
        () => ({
            sendMessage: mutation.mutate,
            sendMessageAsync: mutation.mutateAsync,
            isPending: mutation.isPending,
            isError: mutation.isError,
            error: mutation.error,
            retry,
            isOptimisticMessage,
        }),
        [mutation, retry, isOptimisticMessage]
    );
}
