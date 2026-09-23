/**
 * Friend Request Hooks
 * React Query hooks for friend request management
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PaginationParams } from '@/shared/types/pagination.types';
import { friendsApi, type RelationshipStatus, type RelationshipStatusResponse } from '../api/friends.api';

/**
 * Query key factory for friend-related queries
 */
export const friendRequestKeys = {
    all: ['friend-requests'] as const,
    incoming: (params?: PaginationParams) => [...friendRequestKeys.all, 'incoming', params] as const,
    outgoing: (params?: PaginationParams) => [...friendRequestKeys.all, 'outgoing', params] as const,
    status: (userId: number) => [...friendRequestKeys.all, 'status', userId] as const,
    friends: (params?: PaginationParams) => [...friendRequestKeys.all, 'friends', params] as const,
    mutual: (userId: number, params?: PaginationParams) => [...friendRequestKeys.all, 'mutual', userId, params] as const,
};

/**
 * Get incoming friend requests with infinite scrolling
 */
export function useIncomingFriendRequests(pageSize = 20) {
    return useInfiniteQuery({
        queryKey: friendRequestKeys.incoming({ page: 0, size: pageSize }),
        queryFn: async ({ pageParam = 0 }) => {
            return friendsApi.getIncomingRequests(pageParam, pageSize);
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.hasNext) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        initialPageParam: 0,
    });
}

/**
 * Get outgoing friend requests with infinite scrolling
 */
export function useOutgoingFriendRequests(pageSize = 20) {
    return useInfiniteQuery({
        queryKey: friendRequestKeys.outgoing({ page: 0, size: pageSize }),
        queryFn: async ({ pageParam = 0 }) => {
            return friendsApi.getOutgoingRequests(pageParam, pageSize);
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.hasNext) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        initialPageParam: 0,
    });
}

/**
 * Get relationship status with a specific user
 */
export function useRelationshipStatus(userId: number | undefined) {
    return useQuery<RelationshipStatusResponse | null>({
        queryKey: friendRequestKeys.status(userId ?? 0),
        queryFn: async () => {
            if (!userId) return null;
            return friendsApi.getRelationshipStatus(userId);
        },
        enabled: !!userId,
        staleTime: 30 * 1000, // 30 seconds
    });
}

/**
 * Send a friend request
 */
export function useSendFriendRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (targetUserId: number) => {
            await friendsApi.sendFriendRequest(targetUserId);
            return targetUserId;
        },
        onSuccess: (targetUserId) => {
            // Update relationship status cache
            queryClient.setQueryData<RelationshipStatusResponse>(
                friendRequestKeys.status(targetUserId),
                (old) => ({
                    ...old,
                    status: 'PENDING_OUTGOING' as RelationshipStatus,
                    createdAt: new Date().toISOString(),
                })
            );
            // Invalidate outgoing requests list
            queryClient.invalidateQueries({
                queryKey: friendRequestKeys.outgoing(),
            });
            // Refresh chat threads and conversations as they might display relationship status
            queryClient.invalidateQueries({ queryKey: ['threads'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
}

/**
 * Accept a friend request
 */
export function useAcceptFriendRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (requesterId: number) => {
            await friendsApi.acceptFriendRequest(requesterId);
            return requesterId;
        },
        onSuccess: (requesterId) => {
            // Update relationship status cache
            queryClient.setQueryData<RelationshipStatusResponse>(
                friendRequestKeys.status(requesterId),
                (old) => ({
                    ...old,
                    status: 'FRIEND' as RelationshipStatus,
                })
            );
            // Invalidate incoming requests and friends list
            queryClient.invalidateQueries({
                queryKey: friendRequestKeys.incoming(),
            });
            queryClient.invalidateQueries({
                queryKey: friendRequestKeys.friends(),
            });
            // Refresh chat threads and conversations
            queryClient.invalidateQueries({ queryKey: ['threads'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
}

/**
 * Decline a friend request
 */
export function useDeclineFriendRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (requesterId: number) => {
            await friendsApi.declineFriendRequest(requesterId);
            return requesterId;
        },
        onSuccess: (requesterId) => {
            // Update relationship status cache
            queryClient.setQueryData<RelationshipStatusResponse>(
                friendRequestKeys.status(requesterId),
                (old) => ({
                    ...old,
                    status: 'NONE' as RelationshipStatus,
                })
            );
            // Invalidate incoming requests
            queryClient.invalidateQueries({
                queryKey: friendRequestKeys.incoming(),
            });
        },
    });
}

/**
 * Cancel an outgoing friend request
 */
export function useCancelFriendRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (targetUserId: number) => {
            await friendsApi.cancelFriendRequest(targetUserId);
            return targetUserId;
        },
        onSuccess: (targetUserId) => {
            // Update relationship status cache
            queryClient.setQueryData<RelationshipStatusResponse>(
                friendRequestKeys.status(targetUserId),
                (old) => ({
                    ...old,
                    status: 'NONE' as RelationshipStatus,
                })
            );
            // Invalidate outgoing requests
            queryClient.invalidateQueries({
                queryKey: friendRequestKeys.outgoing(),
            });
        },
    });
}

/**
 * Remove a friend
 */
export function useRemoveFriend() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (friendId: number) => {
            await friendsApi.removeFriend(friendId);
            return friendId;
        },
        onSuccess: (friendId) => {
            // Update relationship status cache
            queryClient.setQueryData<RelationshipStatusResponse>(
                friendRequestKeys.status(friendId),
                (old) => ({
                    ...old,
                    status: 'NONE' as RelationshipStatus,
                })
            );
            // Invalidate friends list
            queryClient.invalidateQueries({
                queryKey: friendRequestKeys.friends(),
            });
        },
    });
}

/**
 * Block a user
 */
export function useBlockUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: number) => {
            await friendsApi.blockUser(userId);
            return userId;
        },
        onSuccess: (userId) => {
            // Update relationship status cache
            queryClient.setQueryData<RelationshipStatusResponse>(
                friendRequestKeys.status(userId),
                (old) => ({
                    ...old,
                    status: 'BLOCKED' as RelationshipStatus,
                })
            );
            // Invalidate related lists
            queryClient.invalidateQueries({
                queryKey: friendRequestKeys.friends(),
            });
            queryClient.invalidateQueries({
                queryKey: friendRequestKeys.incoming(),
            });
            queryClient.invalidateQueries({
                queryKey: friendRequestKeys.outgoing(),
            });
        },
    });
}

/**
 * Unblock a user
 */
export function useUnblockUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: number) => {
            await friendsApi.unblockUser(userId);
            return userId;
        },
        onSuccess: (userId) => {
            // Update relationship status cache
            queryClient.setQueryData<RelationshipStatusResponse>(
                friendRequestKeys.status(userId),
                (old) => ({
                    ...old,
                    status: 'NONE' as RelationshipStatus,
                })
            );
        },
    });
}

/**
 * Combined hook for friend request actions
 * Provides all friend-related mutations in one hook
 */
export function useFriendActions() {
    const sendRequest = useSendFriendRequest();
    const acceptRequest = useAcceptFriendRequest();
    const declineRequest = useDeclineFriendRequest();
    const cancelRequest = useCancelFriendRequest();
    const removeFriend = useRemoveFriend();
    const blockUser = useBlockUser();
    const unblockUser = useUnblockUser();

    return {
        sendRequest,
        acceptRequest,
        declineRequest,
        cancelRequest,
        removeFriend,
        blockUser,
        unblockUser,
        // Convenience methods
        sendFriendRequest: sendRequest.mutate,
        acceptFriendRequest: acceptRequest.mutate,
        declineFriendRequest: declineRequest.mutate,
        cancelFriendRequest: cancelRequest.mutate,
        unfriend: removeFriend.mutate,
        block: blockUser.mutate,
        unblock: unblockUser.mutate,
    };
}
