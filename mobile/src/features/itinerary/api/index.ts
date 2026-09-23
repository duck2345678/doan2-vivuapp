/**
 * Itinerary API Client
 * Integration with backend API for tours, check-ins, and AI suggestions
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type {
  CheckInRequest,
  CheckInResponse,
  ItinerarySuggestRequest,
  SuggestedItinerary,
  TourRequest,
  TourResponse,
  TourStatus,
  TourStopRequest,
  TourStopResponse,
} from "../types/itinerary.types";

// ============================================
// Tours (Itineraries)
// ============================================

/**
 * Get user's tours with optional status filter
 */
export async function getMyTours(status?: TourStatus, page = 0, size = 10) {
  const response = await apiClient.get<{
    code: number;
    message: string;
    result: {
      content: TourResponse[];
      totalElements: number;
      totalPages: number;
    };
  }>(API_ENDPOINTS.TOURS.MY_TOURS, {
    params: { status, page, size },
  });
  return response.result;
}

/**
 * Get current ongoing tour
 */
export async function getCurrentTour() {
  const response = await apiClient.get<{
    code: number;
    message: string;
    result: TourResponse | null;
  }>(API_ENDPOINTS.TOURS.CURRENT);
  return response.result;
}

/**
 * Create a new tour
 */
export async function createTour(data: TourRequest) {
  const response = await apiClient.post<{
    code: number;
    message: string;
    result: TourResponse;
  }>(API_ENDPOINTS.TOURS.MY_TOURS, data);
  return response.result;
}

/**
 * Get tour details by ID
 */
export async function getTourById(id: number) {
  const response = await apiClient.get<{
    code: number;
    message: string;
    result: TourResponse;
  }>(API_ENDPOINTS.TOURS.BY_ID(id));
  return response.result;
}

/**
 * Update tour
 */
export async function updateTour(id: number, data: TourRequest) {
  const response = await apiClient.patch<{
    code: number;
    message: string;
    result: TourResponse;
  }>(API_ENDPOINTS.TOURS.UPDATE(id), data);
  return response.result;
}

/**
 * Complete tour
 */
export async function completeTour(id: number) {
  const response = await apiClient.post<{
    code: number;
    message: string;
    result: TourResponse;
  }>(API_ENDPOINTS.TOURS.COMPLETE(id));
  return response.result;
}

/**
 * Start tour (change status to ONGOING)
 */
export async function startTour(id: number) {
  const response = await apiClient.post<{
    code: number;
    message: string;
    result: TourResponse;
  }>(API_ENDPOINTS.TOURS.START(id));
  return response.result;
}

/**
 * Cancel tour
 */
export async function cancelTour(id: number) {
  const response = await apiClient.post<{
    code: number;
    message: string;
    result: TourResponse;
  }>(API_ENDPOINTS.TOURS.CANCEL(id));
  return response.result;
}

/**
 * Copy tour (reuse itinerary)
 */
export async function copyTour(id: number) {
  const response = await apiClient.post<{
    code: number;
    message: string;
    result: TourResponse;
  }>(API_ENDPOINTS.TOURS.COPY(id));
  return response.result;
}

// ============================================
// Tour Stops
// ============================================

/**
 * Get stops for a tour
 */
export async function getTourStops(tourId: number) {
  const response = await apiClient.get<{
    code: number;
    message: string;
    result: TourStopResponse[];
  }>(API_ENDPOINTS.TOUR_STOPS.LIST(tourId));
  return response.result;
}

/**
 * Add stop to tour
 */
export async function addTourStop(tourId: number, data: TourStopRequest) {
  const response = await apiClient.post<{
    code: number;
    message: string;
    result: TourStopResponse;
  }>(API_ENDPOINTS.TOUR_STOPS.CREATE(tourId), data);
  return response.result;
}

/**
 * Reorder tour stops
 */
export async function reorderTourStops(tourId: number, stopIds: number[]) {
  const response = await apiClient.put<{
    code: number;
    message: string;
    result: TourStopResponse[];
  }>(API_ENDPOINTS.TOUR_STOPS.REORDER(tourId), { stopIds });
  return response.result;
}

/**
 * Remove stop from tour
 */
export async function removeTourStop(tourId: number, stopId: number) {
  await apiClient.delete(API_ENDPOINTS.TOUR_STOPS.DELETE(tourId, stopId));
}

// ============================================
// Check-ins
// ============================================

/**
 * Check in at a place
 */
export async function checkIn(data: CheckInRequest) {
  const response = await apiClient.post<{
    code: number;
    message: string;
    result: CheckInResponse;
  }>(API_ENDPOINTS.CHECK_INS.CREATE, data);
  return response.result;
}

/**
 * Get user's check-in history
 */
export async function getMyCheckIns(
  filters?: {
    placeId?: number;
    tourId?: number;
    from?: string;
    to?: string;
  },
  page = 0,
  size = 10,
) {
  const response = await apiClient.get<{
    code: number;
    message: string;
    result: {
      content: CheckInResponse[];
      totalElements: number;
      totalPages: number;
    };
  }>(API_ENDPOINTS.CHECK_INS.MY_CHECK_INS, {
    params: { ...filters, page, size },
  });
  return response.result;
}

// ============================================
// AI Itinerary Suggestions
// ============================================

/**
 * Get AI-powered itinerary suggestions
 */
export async function suggestItinerary(data: ItinerarySuggestRequest) {
  return await apiClient.post<SuggestedItinerary>(
    API_ENDPOINTS.AI.SUGGEST_ITINERARY,
    data,
  );
}
