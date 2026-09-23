import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { getNextPageParam } from '@/shared/types/pagination.types';
import { conversationsApi, type ConversationSearchParams } from '../api';
import type { ConversationPrivateRequest, FileType } from '@/shared/types/backend.types';

const STALE_TIME = 30 * 1000;

export function usePrivateConversations(params: ConversationSearchParams = {}) {
    return useInfiniteQuery({
        queryKey: queryKeys.conversations.private(params),
        queryFn: async ({ pageParam = 0 }) => {
            const response = await conversationsApi.getPrivateConversations({
                ...params,
                page: pageParam,
            });
            return response.result;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => getNextPageParam(lastPage),
        staleTime: STALE_TIME,
    });
}

export function useChannelConversations(params: ConversationSearchParams = {}) {
    return useInfiniteQuery({
        queryKey: queryKeys.conversations.channels(params),
        queryFn: async ({ pageParam = 0 }) => {
            const response = await conversationsApi.getChannelConversations({
                ...params,
                page: pageParam,
            });
            return response.result;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => getNextPageParam(lastPage),
        staleTime: STALE_TIME,
    });
}

export function useCreatePrivateConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ConversationPrivateRequest) =>
            conversationsApi.createPrivateConversation(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        },
    });
}

export function useDeleteConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (conversationId: string) =>
            conversationsApi.deleteConversation(conversationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        },
    });
}

export function useConversationMedia(conversationId: string | undefined, fileType?: FileType) {
    return useQuery({
        queryKey: ['conversations', conversationId, 'media', fileType],
        queryFn: async () => {
            const response = await conversationsApi.getConversationMedia(
                conversationId!,
                fileType
            );
            return response.result;
        },
        enabled: !!conversationId,
        staleTime: STALE_TIME,
    });
}

export function useJoinConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (conversationId: string) => conversationsApi.joinConversation(conversationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        },
    });
}

export function useAcceptJoinRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (joinRequestId: number) => conversationsApi.acceptJoinRequest(joinRequestId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        },
    });
}

export function useRejectJoinRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (joinRequestId: number) => conversationsApi.rejectJoinRequest(joinRequestId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        },
    });
}
