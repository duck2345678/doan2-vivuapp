import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { websocketService } from '@/lib/websocket';
import type { WebSocketMessage } from '@/lib/websocket';

interface MessageReaction {
    messageId: number;
    userId: number;
    userName: string;
    emoji: string;
    timestamp: string;
}

interface ReactionEvent {
    messageId: number;
    userId: number;
    userName: string;
    emoji: string;
    action: 'add' | 'remove';
}

export function useMessageReactions(messageId: number | undefined, conversationId: string | undefined) {
    const [reactions, setReactions] = useState<MessageReaction[]>([]);

    useEffect(() => {
        if (!messageId || !conversationId || !websocketService.isConnected()) {
            return;
        }

        const subscription = websocketService.subscribeToUserQueue(
            (message: WebSocketMessage<ReactionEvent>) => {
                if (message.eventType === 'REACTION_CHANGED' && message.data.messageId === messageId) {
                    if (message.data.action === 'add') {
                        setReactions((prev) => [
                            ...prev,
                            {
                                messageId: message.data.messageId,
                                userId: message.data.userId,
                                userName: message.data.userName,
                                emoji: message.data.emoji,
                                timestamp: new Date().toISOString(),
                            },
                        ]);
                    } else {
                        setReactions((prev) =>
                            prev.filter(
                                (r) =>
                                    !(
                                        r.userId === message.data.userId &&
                                        r.emoji === message.data.emoji
                                    )
                            )
                        );
                    }
                }
            }
        );

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [messageId, conversationId]);

    const groupedReactions = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction);
        return acc;
    }, {} as Record<string, MessageReaction[]>);

    return { reactions, groupedReactions };
}

export function useAddMessageReaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ messageId, emoji, conversationId }: { messageId: number; emoji: string; conversationId: string }) => {
            console.log('Add reaction:', messageId, emoji);
            return { success: true };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['messages', variables.conversationId],
            });
        },
    });
}

export function useRemoveMessageReaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ messageId, emoji, conversationId }: { messageId: number; emoji: string; conversationId: string }) => {
            console.log('Remove reaction:', messageId, emoji);
            return { success: true };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['messages', variables.conversationId],
            });
        },
    });
}
