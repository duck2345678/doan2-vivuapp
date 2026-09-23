/**
 * useMessageActions Hook
 * Provides message-level actions like unsend, copy, reply
 * Implements optimistic UI updates and error handling
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/config/queryKeys';
import type { MessageResponse } from '@/shared/types/backend.types';
import type { Slice } from '@/shared/types/pagination.types';
import { handleApiError, showSuccessToast } from '@/shared/utils';

import { messagesApi } from '../api';

interface InfiniteMessagesData {
    pages: Slice<MessageResponse>[];
    pageParams: number[];
}

interface UnsendMessageInput {
    messageId: number;
    conversationId: string;
}

/**
 * Hook for message-level actions
 */
export function useMessageActions() {
    const queryClient = useQueryClient();

    const unsendMessage = useMutation({
        mutationFn: async ({ messageId }: UnsendMessageInput) => {
            const response = await messagesApi.deleteMessage(messageId);
            return response.result;
        },
        onMutate: async ({ messageId, conversationId }: UnsendMessageInput) => {
            const queryKey = queryKeys.messages.list(conversationId, {});
            
            await queryClient.cancelQueries({ queryKey });
            
            const previousData = queryClient.getQueryData<InfiniteMessagesData>(queryKey);
            
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) return oldData;

                const newPages = oldData.pages.map((page) => ({
                    ...page,
                    content: page.content.map((msg) => {
                        if (msg.id === messageId) {
                            return {
                                ...msg,
                                isActive: false,
                                content: 'Tin nhắn đã bị thu hồi',
                            };
                        }
                        return msg;
                    }),
                }));

                return { ...oldData, pages: newPages };
            });

            return { previousData, queryKey };
        },
        onError: (error, variables, context) => {
            console.error('[useMessageActions] Unsend failed:', error);
            
            if (context?.previousData) {
                queryClient.setQueryData(context.queryKey, context.previousData);
            }

            handleApiError(error, 'Thu hồi tin nhắn');
        },
        onSuccess: (_, { conversationId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });

            showSuccessToast('Đã thu hồi tin nhắn');
        },
    });

    const copyMessage = useCallback((text: string) => {
        // Note: Clipboard will be imported in MessageBubble component
        console.log('[useMessageActions] Copy message:', text);
    }, []);

    return {
        unsendMessage,
        copyMessage,
        isUnsending: unsendMessage.isPending,
    };
}
