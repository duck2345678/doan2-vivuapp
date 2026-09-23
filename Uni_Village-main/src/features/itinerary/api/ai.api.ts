import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ItinerarySuggestRequest, SuggestedItinerary } from '@/features/tours/types';

export const aiApi = {
    suggestItinerary: (data: ItinerarySuggestRequest): Promise<SuggestedItinerary> =>
        apiClient.post<SuggestedItinerary>(API_ENDPOINTS.AI.SUGGEST_ITINERARY, data),
};
