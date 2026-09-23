import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pinnedMessagesService } from '../services';

export function usePinnedMessages(conversationId: string | undefined) {
    return useQuery({
        queryKey: ['pinnedMessages', conversationId],
        queryFn: () => pinnedMessagesService.getPinnedMessages(conversationId!),
        enabled: !!conversationId,
        staleTime: 30 * 1000,
    });
}

export function usePinMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: number }) =>
            pinnedMessagesService.pinMessage(conversationId, messageId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['pinnedMessages', variables.conversationId],
            });
        },
    });
}

export function useUnpinMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: number }) =>
            pinnedMessagesService.unpinMessage(conversationId, messageId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['pinnedMessages', variables.conversationId],
            });
        },
    });
}
