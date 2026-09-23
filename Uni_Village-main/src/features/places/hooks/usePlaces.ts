/**
 * Places Hooks
 * React Query hooks for Places feature
 */

import { queryKeys } from '@/config/queryKeys';
import { getNextPageParam } from '@/shared/types/pagination.types';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    areasApi,
    locationsApi,
    personalPinsApi,
    placesApi,
    placeSuggestionsApi,
    placeTypesApi,
} from '../api/placesApi';
import type {
    NearbyPlacesParams,
    PersonalPinRequest,
    PlaceSearchParams,
    PlaceSuggestionRequest,
} from '../types/places.types';

// ============================================
// Stale Time Configuration (for social app)
// ============================================
const STALE_TIME = {
    STATIC: 30 * 60 * 1000, // 30 minutes for static data (areas, place types, locations)
    PLACES: 5 * 60 * 1000,  // 5 minutes for places
    USER_DATA: 2 * 60 * 1000, // 2 minutes for user-specific data
};

// ============================================
// Areas Hooks
// ============================================

export function useAreas() {
    return useQuery({
        queryKey: queryKeys.areas.all,
        queryFn: async () => {
            const response = await areasApi.getAreas();
            return response.result;
        },
        staleTime: STALE_TIME.STATIC,
    });
}

// ============================================
// Place Types Hooks
// ============================================

export function usePlaceTypes() {
    return useQuery({
        queryKey: queryKeys.placeTypes.all,
        queryFn: async () => {
            const response = await placeTypesApi.getPlaceTypes();
            return response.result;
        },
        staleTime: STALE_TIME.STATIC,
    });
}

// ============================================
// Locations Hooks
// ============================================

export function useProvinces() {
    return useQuery({
        queryKey: queryKeys.locations.provinces,
        queryFn: async () => {
            const response = await locationsApi.getProvinces();
            return response.result;
        },
        staleTime: STALE_TIME.STATIC,
    });
}

export function useDistricts(provinceId: number | undefined) {
    return useQuery({
        queryKey: queryKeys.locations.districts(provinceId!),
        queryFn: async () => {
            const response = await locationsApi.getDistricts(provinceId!);
            return response.result;
        },
        staleTime: STALE_TIME.STATIC,
        enabled: !!provinceId,
    });
}

export function useWards(districtId: number | undefined) {
    return useQuery({
        queryKey: queryKeys.locations.wards(districtId!),
        queryFn: async () => {
            const response = await locationsApi.getWards(districtId!);
            return response.result;
        },
        staleTime: STALE_TIME.STATIC,
        enabled: !!districtId,
    });
}

// ============================================
// Places Hooks
// ============================================

export function usePlaces(params: PlaceSearchParams) {
    return useInfiniteQuery({
        queryKey: queryKeys.places.list(params),
        queryFn: async ({ pageParam = 0 }) => {
            const response = await placesApi.searchPlaces({ ...params, page: pageParam });
            return response.result;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => getNextPageParam(lastPage),
        staleTime: STALE_TIME.PLACES,
    });
}

/**
 * Hook for fetching nearby VNU places from backend API
 * Named to avoid conflict with map module's useNearbyPlaces
 */
export function useNearbyVnuPlaces(params: NearbyPlacesParams) {
    return useQuery({
        queryKey: queryKeys.places.nearby(params),
        queryFn: async () => {
            const response = await placesApi.getNearbyPlaces(params);
            return response.result;
        },
        staleTime: STALE_TIME.PLACES,
        enabled: !!params.lat && !!params.lng,
    });
}

export function usePlaceDetail(id: number | undefined) {
    return useQuery({
        queryKey: queryKeys.places.detail(id!),
        queryFn: async () => {
            const response = await placesApi.getPlaceById(id!);
            return response.result;
        },
        staleTime: STALE_TIME.PLACES,
        enabled: !!id,
    });
}

// ============================================
// Personal Pins Hooks
// ============================================

export function usePersonalPins(page = 0, size = 10) {
    return useQuery({
        queryKey: queryKeys.personalPins.list({ page, size }),
        queryFn: async () => {
            const response = await personalPinsApi.getPersonalPins(page, size);
            return response.result;
        },
        staleTime: STALE_TIME.USER_DATA,
    });
}

export function useCreatePersonalPin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PersonalPinRequest) => personalPinsApi.createPersonalPin(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.personalPins.all });
        },
    });
}

export function useUpdatePersonalPin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: PersonalPinRequest }) =>
            personalPinsApi.updatePersonalPin(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.personalPins.all });
        },
    });
}

export function useDeletePersonalPin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => personalPinsApi.deletePersonalPin(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.personalPins.all });
        },
    });
}

// ============================================
// Place Suggestions Hooks
// ============================================

export function useMyPlaceSuggestions(status?: string, page = 0, size = 10) {
    return useQuery({
        queryKey: queryKeys.placeSuggestions.my({ page, size }),
        queryFn: async () => {
            const response = await placeSuggestionsApi.getMySuggestions(status, page, size);
            return response.result;
        },
        staleTime: STALE_TIME.USER_DATA,
    });
}

export function useCreatePlaceSuggestion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PlaceSuggestionRequest) => placeSuggestionsApi.createSuggestion(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.placeSuggestions.all });
        },
    });
}
