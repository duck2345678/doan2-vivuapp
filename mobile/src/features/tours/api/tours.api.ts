import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/shared/types/api.types';
import type { Page } from '@/shared/types/pagination.types';
import type {
    TourRequest,
    TourResponse,
    TourShareRequest,
    TourStopRequest,
    TourStopResponse,
    TourStopReorderRequest,
    CheckInRequest,
    CheckInResponse,
    TourSearchParams,
    CheckInSearchParams,
} from '../types';

export const toursApi = {
    getMyTours: (params: TourSearchParams): Promise<ApiResponse<Page<TourResponse>>> =>
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

export const tourStopsApi = {
    getTourStops: (tourId: number): Promise<ApiResponse<TourStopResponse[]>> =>
        apiClient.get<ApiResponse<TourStopResponse[]>>(API_ENDPOINTS.TOUR_STOPS.LIST(tourId)),

    addStop: (tourId: number, data: TourStopRequest): Promise<ApiResponse<TourStopResponse>> =>
        apiClient.post<ApiResponse<TourStopResponse>>(API_ENDPOINTS.TOUR_STOPS.CREATE(tourId), data),

    reorderStops: (tourId: number, data: TourStopReorderRequest): Promise<ApiResponse<TourStopResponse[]>> =>
        apiClient.put<ApiResponse<TourStopResponse[]>>(API_ENDPOINTS.TOUR_STOPS.REORDER(tourId), data),

    deleteStop: (tourId: number, stopId: number): Promise<ApiResponse<string>> =>
        apiClient.delete<ApiResponse<string>>(API_ENDPOINTS.TOUR_STOPS.DELETE(tourId, stopId)),
};

export const checkInsApi = {
    createCheckIn: (data: CheckInRequest): Promise<ApiResponse<CheckInResponse>> =>
        apiClient.post<ApiResponse<CheckInResponse>>(API_ENDPOINTS.CHECK_INS.CREATE, data),

    getMyCheckIns: (params: CheckInSearchParams): Promise<ApiResponse<Page<CheckInResponse>>> =>
        apiClient.get<ApiResponse<Page<CheckInResponse>>>(API_ENDPOINTS.CHECK_INS.MY_CHECK_INS, { params }),
};
