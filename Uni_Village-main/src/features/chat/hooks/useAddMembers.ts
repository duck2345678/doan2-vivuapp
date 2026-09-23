/**
 * useAddMembers hook
 * Mutation for adding members to a group chat
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UserPreview } from '../types';
import { groupMembersKeys } from './useGroupMembers';

interface AddMembersInput {
  threadId: string;
  users: UserPreview[];
}

/**
 * Simulated add members function
 */
async function addMembersToGroup({ threadId, users }: AddMembersInput): Promise<void> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // In production, this would call the actual API
  console.log(`[useAddMembers] Adding ${users.length} member(s) to thread ${threadId}:`, 
    users.map((u) => u.displayName).join(', ')
  );
}

/**
 * Mutation hook for adding members to a group
 */
export function useAddMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addMembersToGroup,
    onSuccess: (_data, variables) => {
      // Invalidate group members cache to refetch
      queryClient.invalidateQueries({
        queryKey: groupMembersKeys.byThread(variables.threadId),
      });
      console.log('[useAddMembers] Members added successfully');
    },
    onError: (error) => {
      console.error('[useAddMembers] Failed to add members:', error);
    },
  });
}
