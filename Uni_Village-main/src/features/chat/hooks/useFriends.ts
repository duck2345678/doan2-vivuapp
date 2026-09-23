/**
 * useFriends hook
 * Fetches friend list for member selection in channel creation
 */
import { useQuery } from '@tanstack/react-query';

import { friendsApi } from '../api';
import type { FriendPreview } from '../types/channel.types';

/**
 * Query key factory for friends queries
 */
export const friendsKeys = {
  all: ['friends'] as const,
  search: (query?: string) => [...friendsKeys.all, 'search', query] as const,
};

/**
 * Fetch and cache friends list with optional search
 * @param searchQuery - Optional search string to filter friends
 */
export function useFriends(searchQuery?: string) {
  return useQuery<FriendPreview[], Error>({
    queryKey: friendsKeys.search(searchQuery),
    queryFn: async (): Promise<FriendPreview[]> => {
      const response = await friendsApi.getFriends(0, 100, searchQuery);
      // Map FriendRequestItem to FriendPreview
      return response.content.map(item => ({
        id: item.user.id.toString(),
        displayName: item.user.displayName,
        avatarUrl: item.user.avatarUrl,
        isOnline: false, // Online status from presence service
        statusText: 'Không hoạt động',
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
