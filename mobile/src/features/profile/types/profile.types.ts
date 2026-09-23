/**
 * Profile Types
 */

import type { BaseEntity } from '@/shared/types';

export interface ProfileLink {
    id: string;
    title: string;
    url: string;
}

export interface Profile extends BaseEntity {
    userId: number;
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
    postsCount: number;
    followersCount: number;
    followingCount: number;
    isFollowing?: boolean;
    interests?: string[];
    links?: ProfileLink[];
    podcastUrl?: string;
    isPrivate?: boolean;
}

export interface UpdateProfileRequest {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
    interests?: string[];
    isPrivate?: boolean;
}
