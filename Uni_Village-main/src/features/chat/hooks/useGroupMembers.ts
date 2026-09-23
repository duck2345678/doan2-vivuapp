/**
 * useGroupMembers hook
 * Fetches group members for a given thread
 */
import { useQuery } from '@tanstack/react-query';

import { fetchGroupMembers } from '../services';
import type { GroupMember } from '../types';

/**
 * Query key factory for group members queries
 */
export const groupMembersKeys = {
  all: ['groupMembers'] as const,
  byThread: (threadId: string) => [...groupMembersKeys.all, threadId] as const,
};

/**
 * Fetch and cache group members
 * @param threadId - Thread identifier
 */
export function useGroupMembers(threadId: string) {
  return useQuery<GroupMember[], Error>({
    queryKey: groupMembersKeys.byThread(threadId),
    queryFn: () => fetchGroupMembers(threadId),
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
