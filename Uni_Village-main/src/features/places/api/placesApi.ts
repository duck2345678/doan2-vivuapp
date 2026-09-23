/**
 * Places API
 * API service functions for Places feature
 */

import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/shared/types/api.types';
import type { Page } from '@/shared/types/pagination.types';
import type {
    AreaResponse,
    DistrictResponse,
    NearbyPlacesParams,
    PersonalPinRequest,
    PersonalPinResponse,
    PlaceResponse,
    PlaceSearchParams,
    PlaceSuggestionRequest,
    PlaceSuggestionResponse,
    PlaceTypeResponse,
    ProvinceResponse,
    WardResponse,
} from '../types/places.types';

// ============================================
// Areas API
// ============================================

export const areasApi = {
    getAreas: (): Promise<ApiResponse<AreaResponse[]>> =>
        apiClient.get<ApiResponse<AreaResponse[]>>(API_ENDPOINTS.AREAS.LIST),
};

// ============================================
// Place Types API
// ============================================

export const placeTypesApi = {
    getPlaceTypes: (): Promise<ApiResponse<PlaceTypeResponse[]>> =>
        apiClient.get<ApiResponse<PlaceTypeResponse[]>>(API_ENDPOINTS.PLACE_TYPES.LIST),
};

// ============================================
// Locations API
// ============================================

export const locationsApi = {
    getProvinces: (): Promise<ApiResponse<ProvinceResponse[]>> =>
        apiClient.get<ApiResponse<ProvinceResponse[]>>(API_ENDPOINTS.LOCATIONS.PROVINCES),

    getDistricts: (provinceId: number): Promise<ApiResponse<DistrictResponse[]>> =>
        apiClient.get<ApiResponse<DistrictResponse[]>>(API_ENDPOINTS.LOCATIONS.DISTRICTS, {
            params: { provinceId },
        }),

    getWards: (districtId: number): Promise<ApiResponse<WardResponse[]>> =>
        apiClient.get<ApiResponse<WardResponse[]>>(API_ENDPOINTS.LOCATIONS.WARDS, {
            params: { districtId },
        }),
};

// ============================================
// Places API
// ============================================

export const placesApi = {
    searchPlaces: (params: PlaceSearchParams): Promise<ApiResponse<Page<PlaceResponse>>> =>
        apiClient.get<ApiResponse<Page<PlaceResponse>>>(API_ENDPOINTS.PLACES.SEARCH, { params }),

    getNearbyPlaces: (params: NearbyPlacesParams): Promise<ApiResponse<PlaceResponse[]>> =>
        apiClient.get<ApiResponse<PlaceResponse[]>>(API_ENDPOINTS.PLACES.NEARBY, { params }),

    getPlaceById: (id: number): Promise<ApiResponse<PlaceResponse>> =>
        apiClient.get<ApiResponse<PlaceResponse>>(API_ENDPOINTS.PLACES.BY_ID(id)),
};

// ============================================
// Place Suggestions API
// ============================================

export const placeSuggestionsApi = {
    createSuggestion: (data: PlaceSuggestionRequest): Promise<ApiResponse<PlaceSuggestionResponse>> =>
        apiClient.post<ApiResponse<PlaceSuggestionResponse>>(API_ENDPOINTS.PLACE_SUGGESTIONS.CREATE, data),

    getMySuggestions: (
        status?: string,
        page = 0,
        size = 10
    ): Promise<ApiResponse<Page<PlaceSuggestionResponse>>> =>
        apiClient.get<ApiResponse<Page<PlaceSuggestionResponse>>>(API_ENDPOINTS.PLACE_SUGGESTIONS.MY_SUGGESTIONS, {
            params: { status, page, size },
        }),
};

// ============================================
// Personal Pins API
// ============================================

export const personalPinsApi = {
    getPersonalPins: (page = 0, size = 10): Promise<ApiResponse<Page<PersonalPinResponse>>> =>
        apiClient.get<ApiResponse<Page<PersonalPinResponse>>>(API_ENDPOINTS.PERSONAL_PINS.LIST, {
            params: { page, size },
        }),

    createPersonalPin: (data: PersonalPinRequest): Promise<ApiResponse<PersonalPinResponse>> =>
        apiClient.post<ApiResponse<PersonalPinResponse>>(API_ENDPOINTS.PERSONAL_PINS.CREATE, data),

    updatePersonalPin: (id: number, data: PersonalPinRequest): Promise<ApiResponse<PersonalPinResponse>> =>
        apiClient.patch<ApiResponse<PersonalPinResponse>>(API_ENDPOINTS.PERSONAL_PINS.UPDATE(id), data),

    deletePersonalPin: (id: number): Promise<ApiResponse<string>> =>
        apiClient.delete<ApiResponse<string>>(API_ENDPOINTS.PERSONAL_PINS.DELETE(id)),
};
