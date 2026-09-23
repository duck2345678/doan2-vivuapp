/**
 * useThreadInfo hook
 * Fetches chat thread info metadata for DM threads
 */
import { useQuery } from '@tanstack/react-query';

import { fetchThreadInfo } from '../services';
import type { ThreadInfo } from '../types';

/**
 * Query key factory for thread info queries
 */
export const threadInfoKeys = {
  all: ['threadInfo'] as const,
  detail: (threadId: string) => [...threadInfoKeys.all, threadId] as const,
};

/**
 * Fetch and cache thread info
 * @param threadId - Thread identifier
 */
export function useThreadInfo(threadId: string) {
  return useQuery<ThreadInfo, Error>({
    queryKey: threadInfoKeys.detail(threadId),
    queryFn: () => fetchThreadInfo(threadId),
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
