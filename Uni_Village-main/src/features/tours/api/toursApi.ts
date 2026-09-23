/**
 * Tours API
 * API service functions for Tours feature
 */

import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/shared/types/api.types';
import type { Page } from '@/shared/types/pagination.types';
import type {
    CheckInRequest,
    CheckInResponse,
    CheckInSearchParams,
    ItinerarySuggestRequest,
    SuggestedItinerary,
    TourRequest,
    TourResponse,
    TourSearchParams,
    TourShareRequest,
    TourStopReorderRequest,
    TourStopRequest,
    TourStopResponse,
} from '../types/tours.types';

// ============================================
// Tours API
// ============================================

export const toursApi = {
    getMyTours: (params: TourSearchParams = {}): Promise<ApiResponse<Page<TourResponse>>> =>
        apiClient.get<ApiResponse<Page<TourResponse>>>(API_ENDPOINTS.TOURS.MY_TOURS, { params }),

    getCurrentTour: (): Promise<ApiResponse<TourResponse | null>> =>
        apiClient.get<ApiResponse<TourResponse | null>>(API_ENDPOINTS.TOURS.CURRENT),

    getTourById: (id: number): Promise<ApiResponse<TourResponse>> =>
        apiClient.get<ApiResponse<TourResponse>>(API_ENDPOINTS.TOURS.BY_ID(id)),

    createTour: (data: TourRequest): Promise<ApiResponse<TourResponse>> =>
        apiClient.post<ApiResponse<TourResponse>>(API_ENDPOINTS.TOURS.MY_TOURS, data),

    updateTour: (id: number, data: TourRequest): Promise<ApiResponse<TourResponse>> =>
        apiClient.patch<ApiResponse<TourResponse>>(API_ENDPOINTS.TOURS.UPDATE(id), data),

    completeTour: (id: number): Promise<ApiResponse<TourResponse>> =>
        apiClient.post<ApiResponse<TourResponse>>(API_ENDPOINTS.TOURS.COMPLETE(id)),

    cancelTour: (id: number): Promise<ApiResponse<TourResponse>> =>
        apiClient.post<ApiResponse<TourResponse>>(API_ENDPOINTS.TOURS.CANCEL(id)),

    shareAsPost: (id: number, data: TourShareRequest): Promise<ApiResponse<TourResponse>> =>
        apiClient.post<ApiResponse<TourResponse>>(API_ENDPOINTS.TOURS.SHARE_AS_POST(id), data),

    copyTour: (id: number): Promise<ApiResponse<TourResponse>> =>
        apiClient.post<ApiResponse<TourResponse>>(API_ENDPOINTS.TOURS.COPY(id)),
};

// ============================================
// Tour Stops API
// ============================================

export const tourStopsApi = {
    getTourStops: (tourId: number): Promise<ApiResponse<TourStopResponse[]>> =>
        apiClient.get<ApiResponse<TourStopResponse[]>>(API_ENDPOINTS.TOUR_STOPS.LIST(tourId)),

    createTourStop: (tourId: number, data: TourStopRequest): Promise<ApiResponse<TourStopResponse>> =>
        apiClient.post<ApiResponse<TourStopResponse>>(API_ENDPOINTS.TOUR_STOPS.CREATE(tourId), data),

    reorderTourStops: (tourId: number, data: TourStopReorderRequest): Promise<ApiResponse<TourStopResponse[]>> =>
        apiClient.put<ApiResponse<TourStopResponse[]>>(API_ENDPOINTS.TOUR_STOPS.REORDER(tourId), data),

    deleteTourStop: (tourId: number, stopId: number): Promise<ApiResponse<string>> =>
        apiClient.delete<ApiResponse<string>>(API_ENDPOINTS.TOUR_STOPS.DELETE(tourId, stopId)),
};

// ============================================
// Check-ins API
// ============================================

export const checkInsApi = {
    createCheckIn: (data: CheckInRequest): Promise<ApiResponse<CheckInResponse>> =>
        apiClient.post<ApiResponse<CheckInResponse>>(API_ENDPOINTS.CHECK_INS.CREATE, data),

    getMyCheckIns: (params: CheckInSearchParams = {}): Promise<ApiResponse<Page<CheckInResponse>>> =>
        apiClient.get<ApiResponse<Page<CheckInResponse>>>(API_ENDPOINTS.CHECK_INS.MY_CHECK_INS, { params }),
};

// ============================================
// AI Itinerary API
// ============================================

export const aiItineraryApi = {
    suggestItinerary: (data: ItinerarySuggestRequest): Promise<SuggestedItinerary> =>
        apiClient.post<SuggestedItinerary>(API_ENDPOINTS.AI.SUGGEST_ITINERARY, data),
};
