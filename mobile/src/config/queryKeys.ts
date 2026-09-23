/**
 * Query Keys
 * Centralized query key factory for React Query
 */

import type { NearbyPlacesParams, PlaceSearchParams } from '@/features/places/types/places.types';
import type { CheckInSearchParams, TourSearchParams } from '@/features/tours/types/tours.types';
import type { PaginationParams } from '@/shared/types/pagination.types';

/**
 * Query key factory for type-safe and consistent query keys
 */
export const queryKeys = {
    // ============================================
    // Places
    // ============================================
    places: {
        all: ['places'] as const,
        list: (params: PlaceSearchParams) => [...queryKeys.places.all, 'list', params] as const,
        nearby: (params: NearbyPlacesParams) => [...queryKeys.places.all, 'nearby', params] as const,
        detail: (id: number) => [...queryKeys.places.all, 'detail', id] as const,
    },

    areas: {
        all: ['areas'] as const,
    },

    placeTypes: {
        all: ['placeTypes'] as const,
    },

    locations: {
        provinces: ['locations', 'provinces'] as const,
        districts: (provinceId: number) => ['locations', 'districts', provinceId] as const,
        wards: (districtId: number) => ['locations', 'wards', districtId] as const,
    },

    personalPins: {
        all: ['personalPins'] as const,
        list: (params: PaginationParams) => [...queryKeys.personalPins.all, 'list', params] as const,
    },

    placeSuggestions: {
        all: ['placeSuggestions'] as const,
        my: (params: PaginationParams) => [...queryKeys.placeSuggestions.all, 'my', params] as const,
    },

    // ============================================
    // Tours
    // ============================================
    tours: {
        all: ['tours'] as const,
        list: (params: TourSearchParams) => [...queryKeys.tours.all, 'list', params] as const,
        current: [...['tours'], 'current'] as const,
        detail: (id: number) => [...queryKeys.tours.all, 'detail', id] as const,
        stops: (tourId: number) => [...queryKeys.tours.all, 'stops', tourId] as const,
    },

    checkIns: {
        all: ['checkIns'] as const,
        list: (params: CheckInSearchParams) => [...queryKeys.checkIns.all, 'list', params] as const,
    },

    // ============================================
    // Posts
    // ============================================
    posts: {
        all: ['posts'] as const,
        feed: (params: PaginationParams) => [...queryKeys.posts.all, 'feed', params] as const,
        my: (params: PaginationParams) => [...queryKeys.posts.all, 'my', params] as const,
        saved: (params: PaginationParams) => [...queryKeys.posts.all, 'saved', params] as const,
        detail: (id: number) => [...queryKeys.posts.all, 'detail', id] as const,
        comments: (postId: number, params: PaginationParams) =>
            [...queryKeys.posts.all, 'comments', postId, params] as const,
    },

    // ============================================
    // Chat & Messages
    // ============================================
    conversations: {
        all: ['conversations'] as const,
        private: (params: PaginationParams) => [...queryKeys.conversations.all, 'private', params] as const,
        channels: (params: PaginationParams) => [...queryKeys.conversations.all, 'channels', params] as const,
    },

    messages: {
        all: ['messages'] as const,
        list: (conversationId: string, params: PaginationParams) =>
            [...queryKeys.messages.all, conversationId, params] as const,
        search: (conversationId: string, keyword: string) =>
            [...queryKeys.messages.all, 'search', conversationId, keyword] as const,
    },

    // ============================================
    // Channels
    // ============================================
    channels: {
        all: ['channels'] as const,
        detail: (id: number) => [...queryKeys.channels.all, 'detail', id] as const,
        byConversation: (conversationId: string) => [...queryKeys.channels.all, 'conversation', conversationId] as const,
        members: (channelId: number) => [...queryKeys.channels.all, 'members', channelId] as const,
        joinRequests: (channelId: number) => [...queryKeys.channels.all, 'joinRequests', channelId] as const,
    },
} as const;
