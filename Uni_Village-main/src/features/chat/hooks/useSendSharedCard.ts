/**
 * useSendSharedCard hook
 * Sends a shared card message (e.g., itinerary) with optimistic updates
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { generateMessageId, getCurrentTimeLabel } from '../services';
import type { Message, SharedCard, SharedCardMessage } from '../types';
import { messageKeys } from './useMessages';

export interface SendSharedCardInput {
  threadId: string;
  card: SharedCard;
}

/**
 * Creates a new outgoing shared card message
 */
function createOutgoingSharedCardMessage(card: SharedCard): SharedCardMessage {
  return {
    id: generateMessageId(),
    type: 'sharedCard',
    sender: 'me',
    card,
    createdAt: new Date().toISOString(),
    timeLabel: getCurrentTimeLabel(),
    status: 'sent',
  };
}

interface MutationContext {
  previousMessages: Message[] | undefined;
  optimisticMessage: SharedCardMessage;
}

/**
 * Send a shared card message with optimistic updates
 */
export function useSendSharedCard() {
  const queryClient = useQueryClient();

  return useMutation<SharedCardMessage, Error, SendSharedCardInput, MutationContext>({
    mutationFn: async ({ card }) => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 200));
      return createOutgoingSharedCardMessage(card);
    },
    onMutate: async ({ threadId, card }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: messageKeys.list(threadId) });

      // Snapshot previous messages
      const previousMessages = queryClient.getQueryData<Message[]>(
        messageKeys.list(threadId)
      );

      // Optimistically add new message
      const optimisticMessage = createOutgoingSharedCardMessage(card);
      queryClient.setQueryData<Message[]>(messageKeys.list(threadId), (old) => [
        ...(old ?? []),
        optimisticMessage,
      ]);

      return { previousMessages, optimisticMessage };
    },
    onError: (_err, { threadId }, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messageKeys.list(threadId),
          context.previousMessages
        );
      }
    },
    onSuccess: (newMessage, { threadId }, context) => {
      // Update the optimistic message with the real one
      queryClient.setQueryData<Message[]>(messageKeys.list(threadId), (old) =>
        (old ?? []).map((msg) =>
          msg.id === context?.optimisticMessage.id ? newMessage : msg
        )
      );
    },
  });
}
