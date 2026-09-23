/**
 * Feed Types
 */

import type { User } from '@/features/auth';
import type { BaseEntity, PaginatedResponse } from '@/shared/types';

export interface FeedItem extends BaseEntity {
    content: string;
    imageUrls?: string[];
    author: User;
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    location?: {
        name: string;
        lat: number;
        lng: number;
    };
}

export type FeedResponse = PaginatedResponse<FeedItem>;
