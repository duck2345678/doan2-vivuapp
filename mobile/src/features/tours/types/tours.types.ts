import type {
    TourRequest as BackendTourRequest,
    TourResponse as BackendTourResponse,
    TourStatus,
    TourShareRequest as BackendTourShareRequest,
    TourStopRequest as BackendTourStopRequest,
    TourStopResponse as BackendTourStopResponse,
    TourStopReorderRequest as BackendTourStopReorderRequest,
    CheckInRequest as BackendCheckInRequest,
    CheckInResponse as BackendCheckInResponse,
    ItinerarySuggestRequest as BackendItinerarySuggestRequest,
    SuggestedItinerary as BackendSuggestedItinerary,
    SuggestedStop as BackendSuggestedStop,
} from '@/shared/types/backend.types';

export type TourRequest = BackendTourRequest;
export type TourResponse = BackendTourResponse;
export type TourShareRequest = BackendTourShareRequest;
export type TourStopRequest = BackendTourStopRequest;
export type TourStopResponse = BackendTourStopResponse;
export type TourStopReorderRequest = BackendTourStopReorderRequest;
export type CheckInRequest = BackendCheckInRequest;
export type CheckInResponse = BackendCheckInResponse;
export type ItinerarySuggestRequest = BackendItinerarySuggestRequest;
export type SuggestedItinerary = BackendSuggestedItinerary;
export type SuggestedStop = BackendSuggestedStop;

export type { TourStatus };

export interface TourSearchParams {
    status?: TourStatus;
    page?: number;
    size?: number;
}

export interface CheckInSearchParams {
    placeId?: number;
    tourId?: number;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
}
