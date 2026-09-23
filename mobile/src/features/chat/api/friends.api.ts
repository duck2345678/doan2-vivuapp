/**
 * Friend API Service
 * REST API calls for friend request and relationship management
 */
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

/**
 * Relationship status between users
 */
export type RelationshipStatus =
    | 'NONE'
    | 'PENDING_OUTGOING'
    | 'PENDING_INCOMING'
    | 'FRIEND'
    | 'BLOCKED'
    | 'BLOCKED_BY';

/**
 * User summary for friend-related responses
 */
export interface UserSummary {
    id: number;
    displayName: string;
    username?: string;
    avatarUrl?: string;
}

/**
 * Relationship status response from backend
 */
export interface RelationshipStatusBackendResponse {
    status: RelationshipStatus | null;
    areFriends: boolean;
    targetUserId: number;
    createdAt?: string;
    mutualFriendsCount?: number;
}

/**
 * Relationship status response (normalized)
 */
export interface RelationshipStatusResponse {
    status: RelationshipStatus;
    createdAt?: string;
    mutualFriendsCount?: number;
}

/**
 * Friend request item for lists
 */
export interface FriendRequestItem {
    user: UserSummary;
    status: RelationshipStatus;
    createdAt: string;
}

/**
 * Paginated list of friend requests
 */
export interface FriendRequestsPage {
    content: FriendRequestItem[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
}

/**
 * Friend API methods
 */
export const friendsApi = {
    /**
     * Get relationship status with another user
     */
    getRelationshipStatus: async (targetUserId: number): Promise<RelationshipStatusResponse> => {
        const response = await apiClient.get<RelationshipStatusBackendResponse>(
            API_ENDPOINTS.FRIENDS.STATUS(targetUserId)
        );
        return {
            status: response.status || 'NONE',
            createdAt: response.createdAt,
            mutualFriendsCount: response.mutualFriendsCount,
        };
    },

    /**
     * Send a friend request to a user
     */
    sendFriendRequest: async (targetUserId: number): Promise<void> => {
        await apiClient.post(API_ENDPOINTS.FRIENDS.SEND_REQUEST(targetUserId));
    },

    /**
     * Accept an incoming friend request
     */
    acceptFriendRequest: async (requesterId: number): Promise<void> => {
        await apiClient.post(API_ENDPOINTS.FRIENDS.ACCEPT_REQUEST(requesterId));
    },

    /**
     * Decline an incoming friend request
     */
    declineFriendRequest: async (requesterId: number): Promise<void> => {
        await apiClient.post(API_ENDPOINTS.FRIENDS.DECLINE_REQUEST(requesterId));
    },

    /**
     * Cancel an outgoing friend request
     */
    cancelFriendRequest: async (targetUserId: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.FRIENDS.CANCEL_REQUEST(targetUserId));
    },

    /**
     * Remove a friend
     */
    removeFriend: async (friendId: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.FRIENDS.REMOVE_FRIEND(friendId));
    },

    /**
     * Block a user
     */
    blockUser: async (userId: number): Promise<void> => {
        await apiClient.post(API_ENDPOINTS.FRIENDS.BLOCK(userId));
    },

    /**
     * Unblock a user
     */
    unblockUser: async (userId: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.FRIENDS.UNBLOCK(userId));
    },

    /**
     * Get incoming friend requests (pending)
     */
    getIncomingRequests: async (page = 0, size = 20): Promise<FriendRequestsPage> => {
        const response = await apiClient.get<{ result: FriendRequestsPage }>(
            `${API_ENDPOINTS.FRIENDS.INCOMING_REQUESTS}?page=${page}&size=${size}`
        );
        return response.result;
    },

    /**
     * Get outgoing friend requests (sent by me)
     */
    getOutgoingRequests: async (page = 0, size = 20): Promise<FriendRequestsPage> => {
        const response = await apiClient.get<{ result: FriendRequestsPage }>(
            `${API_ENDPOINTS.FRIENDS.OUTGOING_REQUESTS}?page=${page}&size=${size}`
        );
        return response.result;
    },

    /**
     * Get friends list
     */
    getFriends: async (page = 0, size = 20, search?: string): Promise<FriendRequestsPage> => {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });
        if (search) {
            params.append('search', search);
        }
        const response = await apiClient.get<{ result: FriendRequestsPage }>(
            `${API_ENDPOINTS.FRIENDS.LIST}?${params}`
        );
        return response.result;
    },

    /**
     * Get mutual friends with a user
     */
    getMutualFriends: async (userId: number, page = 0, size = 20): Promise<FriendRequestsPage> => {
        const response = await apiClient.get<{ result: FriendRequestsPage }>(
            `${API_ENDPOINTS.FRIENDS.MUTUAL(userId)}?page=${page}&size=${size}`
        );
        return response.result;
    },

    /**
     * Check if two users are friends
     */
    areFriends: async (userId: number): Promise<boolean> => {
        const status = await friendsApi.getRelationshipStatus(userId);
        return status.status === 'FRIEND';
    },
};
