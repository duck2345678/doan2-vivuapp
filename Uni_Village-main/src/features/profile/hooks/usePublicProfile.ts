/**
 * usePublicProfile Hook - Fetches any user's public profile by ID
 */

import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import type { Profile } from '../types';

export const publicProfileKeys = {
  all: ['publicProfile'] as const,
  detail: (userId: number) => [...publicProfileKeys.all, userId] as const,
};

export function usePublicProfile(userId?: number) {
  return useQuery<Profile, Error>({
    queryKey: userId ? publicProfileKeys.detail(userId) : publicProfileKeys.all,
    queryFn: () => profileApi.getProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

