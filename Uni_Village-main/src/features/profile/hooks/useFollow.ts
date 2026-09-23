/**
 * useFollow Hook - Mutations for follow/unfollow operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import { profileKeys } from './useProfile';
import { publicProfileKeys } from './usePublicProfile';

interface UseFollowOptions {
    userId: number;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export function useFollow({ userId, onSuccess, onError }: UseFollowOptions) {
    const queryClient = useQueryClient();

    const followMutation = useMutation({
        mutationFn: () => profileApi.follow(userId),
        onSuccess: () => {
            // Invalidate profile queries to refresh follow state
            queryClient.invalidateQueries({ queryKey: publicProfileKeys.detail(userId) });
            queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
            queryClient.invalidateQueries({ queryKey: profileKeys.me() });
            onSuccess?.();
        },
        onError: (error: Error) => {
            onError?.(error);
        },
    });

    const unfollowMutation = useMutation({
        mutationFn: () => profileApi.unfollow(userId),
        onSuccess: () => {
            // Invalidate profile queries to refresh follow state
            queryClient.invalidateQueries({ queryKey: publicProfileKeys.detail(userId) });
            queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
            queryClient.invalidateQueries({ queryKey: profileKeys.me() });
            onSuccess?.();
        },
        onError: (error: Error) => {
            onError?.(error);
        },
    });

    return {
        follow: followMutation.mutateAsync,
        unfollow: unfollowMutation.mutateAsync,
        isFollowing: followMutation.isPending,
        isUnfollowing: unfollowMutation.isPending,
        isPending: followMutation.isPending || unfollowMutation.isPending,
    };
}
