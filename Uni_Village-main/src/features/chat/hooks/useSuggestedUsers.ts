/**
 * useSuggestedUsers hook
 * Fetches suggested users for adding to a group
 */
import { useQuery } from '@tanstack/react-query';

import { fetchSuggestedUsers } from '../services';
import type { UserPreview } from '../types';

/**
 * Query key factory for suggested users queries
 */
export const suggestedUsersKeys = {
  all: ['suggestedUsers'] as const,
};

/**
 * Fetch and cache suggested users
 */
export function useSuggestedUsers() {
  return useQuery<UserPreview[], Error>({
    queryKey: suggestedUsersKeys.all,
    queryFn: fetchSuggestedUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
