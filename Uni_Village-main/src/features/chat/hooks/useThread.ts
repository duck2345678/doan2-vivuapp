/**
 * useThread hook
 * Fetches chat thread metadata (peer info, online status) for DM or Group
 */
import { useQuery } from '@tanstack/react-query';

import {
    extractUserIdFromVirtualThread,
    fetchGroupThread,
    fetchThread,
    fetchVirtualThread,
    isGroupThreadId,
    isVirtualThreadId
} from '../services';
import type { Thread } from '../types';

/**
 * Query key factory for thread queries
 */
export const threadKeys = {
  all: ['threads'] as const,
  detail: (threadId: string) => [...threadKeys.all, threadId] as const,
};

/**
 * Fetch and cache thread info (DM or Group)
 * @param threadId - Thread identifier (can be conversationId, user-{userId}, or group/channel id)
 */
export function useThread(threadId: string) {
  return useQuery<Thread, Error>({
    queryKey: threadKeys.detail(threadId),
    queryFn: async () => {
      // Check if it's a virtual thread (user-{userId})
      if (isVirtualThreadId(threadId)) {
        const userId = extractUserIdFromVirtualThread(threadId);
        if (!userId) {
          throw new Error('Invalid virtual thread ID');
        }
        const response = await fetchVirtualThread(userId);
        return response.thread;
      }

      // Check if it's explicitly a group thread (has group- or channel- prefix)
      if (isGroupThreadId(threadId)) {
        const response = await fetchGroupThread(threadId);
        if (response) {
          return response.thread;
        }
        throw new Error('Group thread not found');
      }
      
      // Try DM thread first
      const dmResponse = await fetchThread(threadId);
      
      // If DM thread was found with a proper peer (not just a fallback)
      // Check if the peer's displayName is not the default fallback
      if (dmResponse.thread.type === 'dm' && 
          dmResponse.thread.peer.displayName !== 'Người dùng') {
        return dmResponse.thread;
      }
      
      // Try as group/channel thread (for channel conversation IDs which are UUIDs)
      const groupResponse = await fetchGroupThread(threadId);
      if (groupResponse) {
        return groupResponse.thread;
      }
      
      // Return DM response as fallback
      return dmResponse.thread;
    },
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
