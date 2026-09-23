import { queryKeys } from '@/config/queryKeys';
import type { MarkReadRequest, MessageRequest } from '@/shared/types/backend.types';
import { getNextPageParam } from '@/shared/types/pagination.types';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    messagesApi,
    type GetMessagesParams,
    type MessageSearchParams,
    type SendMessageFormData,
} from '../api';
import { isVirtualThreadId } from '../services';

const STALE_TIME = 10 * 1000;

/**
 * Query key factory for messages - used by optimistic update hooks
 */
export const messageKeys = {
    all: ['messages'] as const,
    list: (threadId: string) => [...messageKeys.all, threadId] as const,
};

export function useMessages(conversationId: string | undefined, params: Omit<GetMessagesParams, 'conversationId'> = {}) {
    const isVirtual = conversationId ? isVirtualThreadId(conversationId) : false;

    return useInfiniteQuery({
        queryKey: queryKeys.messages.list(conversationId!, params),
        queryFn: async ({ pageParam = 0 }) => {
            if (isVirtual) {
                return {
                    content: [],
                    pageable: {
                        pageNumber: 0,
                        pageSize: 20,
                        sort: { sorted: false, unsorted: true, empty: true },
                        offset: 0,
                        paged: true,
                        unpaged: false,
                    },
                    totalElements: 0,
                    totalPages: 0,
                    size: 20,
                    number: 0,
                    sort: { sorted: false, unsorted: true, empty: true },
                    numberOfElements: 0,
                    first: true,
                    last: true,
                    empty: true,
                };
            }

            const response = await messagesApi.getMessages({
                conversationId: conversationId!,
                ...params,
                page: pageParam,
            });
            return response.result;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => getNextPageParam(lastPage),
        enabled: !!conversationId,
        staleTime: STALE_TIME,
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: MessageRequest) => messagesApi.sendMessage(data),
        onSuccess: (_, variables) => {
            if (variables.ConversationId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.messages.list(variables.ConversationId, {}),
                });
                queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
            }
        },
    });
}

export function useSendMessageWithFiles() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SendMessageFormData) => messagesApi.sendMessageWithFiles(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.messages.list(variables.conversationId, {}),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        },
    });
}

export function useUpdateMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ messageId, content, conversationId }: { messageId: number; content: string; conversationId: string }) =>
            messagesApi.updateMessage(messageId, content),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.messages.list(variables.conversationId, {}),
            });
        },
    });
}

export function useDeleteMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ messageId, conversationId }: { messageId: number; conversationId: string }) =>
            messagesApi.deleteMessage(messageId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.messages.list(variables.conversationId, {}),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        },
    });
}

export function useMarkAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: MarkReadRequest) => messagesApi.markAsRead(data),
        onSuccess: (_, variables) => {
            if (variables.conversationId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.messages.list(variables.conversationId, {}),
                });
                queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
            }
        },
    });
}

export function useSearchMessages(params: MessageSearchParams | undefined) {
    return useInfiniteQuery({
        queryKey: queryKeys.messages.search(params?.conversationId || '', params?.keyword || ''),
        queryFn: async ({ pageParam = 0 }) => {
            const response = await messagesApi.searchMessages({
                ...params!,
                page: pageParam,
            });
            return response.result;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => getNextPageParam(lastPage),
        enabled: !!params?.conversationId && !!params?.keyword,
        staleTime: STALE_TIME,
    });
}
