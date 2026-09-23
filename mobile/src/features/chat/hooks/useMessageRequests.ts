/**
 * Message Request Hooks
 * React Query hooks for message request management (from non-friends)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/config/queryKeys';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { useChatStore } from '../store';

/**
 * Accept a message request - upgrades conversation from REQUEST to INBOX
 */
export function useAcceptMessageRequest() {
    const queryClient = useQueryClient();
    const { removeMessageRequest } = useChatStore.getState();

    return useMutation({
        mutationFn: async (conversationId: string) => {
            await apiClient.post(API_ENDPOINTS.CONVERSATIONS.ACCEPT_REQUEST(conversationId));
            return conversationId;
        },
        onSuccess: (conversationId) => {
            // Remove from message requests store
            removeMessageRequest(conversationId);

            // Invalidate conversations to reflect the change
            queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
        },
    });
}

/**
 * Delete/decline a message request
 */
export function useDeleteMessageRequest() {
    const queryClient = useQueryClient();
    const { removeMessageRequest } = useChatStore.getState();

    return useMutation({
        mutationFn: async (conversationId: string) => {
            await apiClient.delete(API_ENDPOINTS.CONVERSATIONS.DELETE_REQUEST(conversationId));
            return conversationId;
        },
        onSuccess: (conversationId) => {
            // Remove from message requests store
            removeMessageRequest(conversationId);

            // Invalidate conversations
            queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
        },
    });
}

/**
 * Get message requests from chat store
 * This is a convenience hook that wraps the Zustand selector
 */
export function useMessageRequestsList() {
    const messageRequests = useChatStore((state) =>
        Array.from(state.messageRequests.values())
    );
    const count = useChatStore((state) => state.messageRequests.size);

    return {
        messageRequests,
        count,
        hasRequests: count > 0,
    };
}

/**
 * Combined hook for message request actions
 */
export function useMessageRequestActions() {
    const acceptRequest = useAcceptMessageRequest();
    const deleteRequest = useDeleteMessageRequest();

    return {
        acceptRequest,
        deleteRequest,
        accept: acceptRequest.mutate,
        decline: deleteRequest.mutate,
        isAccepting: acceptRequest.isPending,
        isDeleting: deleteRequest.isPending,
    };
}
