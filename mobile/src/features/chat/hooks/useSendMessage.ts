/**
 * useSendMessage hook
 * Sends a message and handles conversation creation for virtual threads
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { conversationsApi, messagesApi } from '../api';
import { 
  isVirtualThreadId, 
  extractUserIdFromVirtualThread 
} from '../services';
import type { SendMessageInput } from '../types';
import { queryKeys } from '@/config/queryKeys';

interface SendMessageResult {
  conversationId: string;
  messageId: number;
  wasVirtual: boolean;
}

/**
 * Send a new message, creating conversation if needed
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<SendMessageResult, Error, SendMessageInput>({
    mutationFn: async ({ threadId, text }) => {
      let conversationId = threadId;
      const wasVirtual = isVirtualThreadId(threadId);

      if (wasVirtual) {
        const userId = extractUserIdFromVirtualThread(threadId);
        if (!userId) {
          throw new Error('Invalid virtual thread ID');
        }

        const response = await conversationsApi.getOrCreateDirect(userId);
        conversationId = response.result.conversationId;
      }

      const messageResponse = await messagesApi.sendMessage({
        content: text,
        ConversationId: conversationId,
      });

      return {
        conversationId,
        messageId: messageResponse.result.id || 0,
        wasVirtual,
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(result.conversationId, {}),
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.conversations.all 
      });

      // If this was a virtual conversation, navigate to the real conversation
      if (result.wasVirtual && result.conversationId !== variables.threadId) {
        router.replace(`/chat/${result.conversationId}` as any);
      }
    },
  });
}
