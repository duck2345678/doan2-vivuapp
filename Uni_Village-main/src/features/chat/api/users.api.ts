import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/shared/types/api.types';
import type { Slice } from '@/shared/types/pagination.types';
import type { RelationshipStatus } from './friends.api';

export interface UserSearchResult {
    id: number;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
    relationshipStatus: RelationshipStatus;
}

export interface UserSearchParams {
    query: string;
    page?: number;
    size?: number;
}

export const usersApi = {
    searchUsers: async (params: UserSearchParams): Promise<ApiResponse<Slice<UserSearchResult>>> => {
        const searchParams = new URLSearchParams({
            query: params.query,
            page: (params.page ?? 0).toString(),
            size: (params.size ?? 20).toString(),
        });

        return apiClient.get<ApiResponse<Slice<UserSearchResult>>>(
            `${API_ENDPOINTS.USERS.SEARCH}?${searchParams}`
        );
    },
};
