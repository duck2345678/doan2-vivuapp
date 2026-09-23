/**
 * useProfile Hook - Fetches current user's profile or another user's profile
 */

import { useAuthStore } from '@/features/auth/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import type { Profile } from '../types';

export const profileKeys = {
    all: ['profile'] as const,
    me: () => [...profileKeys.all, 'me'] as const,
    detail: (userId: number) => [...profileKeys.all, 'user', userId] as const,
};

/**
 * Hook to get current user's profile
 */
export function useMyProfile() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    const query = useQuery<Profile>({
        queryKey: profileKeys.me(),
        queryFn: () => profileApi.getMyProfile(),
        enabled: isAuthenticated,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return {
        profile: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

/**
 * Hook to get any user's profile by ID
 */
export function useProfile(userId?: number) {
    const query = useQuery<Profile>({
        queryKey: userId ? profileKeys.detail(userId) : profileKeys.all,
        queryFn: () => profileApi.getProfile(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        profile: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

