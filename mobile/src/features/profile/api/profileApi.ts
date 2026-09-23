/**
 * Profile API - Complete API Client for Profile Feature
 */

import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse, PaginatedResponse } from '@/shared/types';
import type { Profile, ProfilePost, UpdateProfileRequest } from '../types';

export interface FollowersResponse {
    content: Profile[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export const profileApi = {
    /**
     * Get current user's profile
     */
    getMyProfile: async (): Promise<Profile> => {
        const response = await apiClient.get<ApiResponse<Profile>>(API_ENDPOINTS.PROFILE.ME);
        return response.result;
    },

    /**
     * Get profile by user ID
     */
    getProfile: async (userId: number): Promise<Profile> => {
        const response = await apiClient.get<ApiResponse<Profile>>(API_ENDPOINTS.PROFILE.BY_ID(userId));
        return response.result;
    },

    /**
     * Update current user's profile
     */
    updateProfile: async (data: UpdateProfileRequest): Promise<Profile> => {
        const response = await apiClient.put<ApiResponse<Profile>>(API_ENDPOINTS.PROFILE.UPDATE, data);
        return response.result;
    },

    /**
     * Upload avatar image
     */
    uploadAvatar: async (file: {
        uri: string;
        name: string;
        type: string;
    }): Promise<Profile> => {
        const formData = new FormData();
        formData.append('file', file as unknown as Blob);
        const response = await apiClient.post<ApiResponse<Profile>>(API_ENDPOINTS.PROFILE.UPLOAD_AVATAR, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.result;
    },

    /**
     * Upload cover image
     */
    uploadCover: async (file: {
        uri: string;
        name: string;
        type: string;
    }): Promise<Profile> => {
        const formData = new FormData();
        formData.append('file', file as unknown as Blob);
        const response = await apiClient.post<ApiResponse<Profile>>(API_ENDPOINTS.PROFILE.UPLOAD_COVER, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.result;
    },

    /**
     * Follow a user
     */
    follow: async (userId: number): Promise<void> => {
        await apiClient.post<ApiResponse<void>>(API_ENDPOINTS.PROFILE.FOLLOW(userId));
    },

    /**
     * Unfollow a user
     */
    unfollow: async (userId: number): Promise<void> => {
        await apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.PROFILE.FOLLOW(userId));
    },

    /**
     * Get followers list
     */
    getFollowers: async (userId: number, page = 0, size = 20): Promise<FollowersResponse> => {
        const response = await apiClient.get<ApiResponse<FollowersResponse>>(
            API_ENDPOINTS.PROFILE.FOLLOWERS(userId),
            { params: { page, size } }
        );
        return response.result;
    },

    /**
     * Get following list
     */
    getFollowing: async (userId: number, page = 0, size = 20): Promise<FollowersResponse> => {
        const response = await apiClient.get<ApiResponse<FollowersResponse>>(
            API_ENDPOINTS.PROFILE.FOLLOWING(userId),
            { params: { page, size } }
        );
        return response.result;
    },

    /**
     * Get current user's posts (my posts)
     */
    getMyPosts: async (page = 0, size = 20): Promise<PaginatedResponse<ProfilePost>> => {
        const response = await apiClient.get<ApiResponse<PaginatedResponse<ProfilePost>>>(
            API_ENDPOINTS.POSTS.MY_POSTS,
            { params: { page, size } }
        );
        return response.result;
    },

    /**
     * Get user's posts
     */
    getUserPosts: async (
        userId: number,
        page = 0,
        size = 20
    ): Promise<PaginatedResponse<ProfilePost>> => {
        const response = await apiClient.get<ApiResponse<PaginatedResponse<ProfilePost>>>(
            API_ENDPOINTS.POSTS.BY_USER(userId),
            { params: { page, size } }
        );
        return response.result;
    },

    /**
     * Get user's saved posts
     */
    getSavedPosts: async (page = 0, size = 20): Promise<PaginatedResponse<ProfilePost>> => {
        const response = await apiClient.get<ApiResponse<PaginatedResponse<ProfilePost>>>(
            API_ENDPOINTS.POSTS.SAVED_POSTS,
            { params: { page, size } }
        );
        return response.result;
    },
};

