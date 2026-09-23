import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../api';
import type { ItinerarySuggestRequest } from '@/features/tours/types';

export function useAiItinerarySuggestion() {
    return useMutation({
        mutationFn: (data: ItinerarySuggestRequest) => aiApi.suggestItinerary(data),
    });
}
