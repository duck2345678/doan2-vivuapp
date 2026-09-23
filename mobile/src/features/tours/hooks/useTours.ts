import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { getNextPageParam } from '@/shared/types/pagination.types';
import { toursApi, tourStopsApi, checkInsApi } from '../api';
import type {
    TourRequest,
    TourShareRequest,
    TourStopRequest,
    TourStopReorderRequest,
    CheckInRequest,
    TourSearchParams,
    CheckInSearchParams,
} from '../types';

const STALE_TIME = {
    TOURS: 2 * 60 * 1000,
    CURRENT_TOUR: 1 * 60 * 1000,
};

export function useMyTours(params: TourSearchParams = {}) {
    return useInfiniteQuery({
        queryKey: queryKeys.tours.list(params),
        queryFn: async ({ pageParam = 0 }) => {
            const response = await toursApi.getMyTours({ ...params, page: pageParam });
            return response.result;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => getNextPageParam(lastPage),
        staleTime: STALE_TIME.TOURS,
    });
}

export function useCurrentTour() {
    return useQuery({
        queryKey: queryKeys.tours.current,
        queryFn: async () => {
            const response = await toursApi.getCurrentTour();
            return response.result;
        },
        staleTime: STALE_TIME.CURRENT_TOUR,
    });
}

export function useTourDetail(id: number | undefined) {
    return useQuery({
        queryKey: queryKeys.tours.detail(id!),
        queryFn: async () => {
            const response = await toursApi.getTourById(id!);
            return response.result;
        },
        enabled: !!id,
        staleTime: STALE_TIME.TOURS,
    });
}

export function useCreateTour() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: TourRequest) => toursApi.createTour(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.all });
        },
    });
}

export function useUpdateTour() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: TourRequest }) =>
            toursApi.updateTour(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.all });
        },
    });
}

export function useCompleteTour() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => toursApi.completeTour(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.current });
        },
    });
}

export function useCancelTour() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => toursApi.cancelTour(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.current });
        },
    });
}

export function useShareTourAsPost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: TourShareRequest }) =>
            toursApi.shareAsPost(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
        },
    });
}

export function useCopyTour() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => toursApi.copyTour(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.all });
        },
    });
}

export function useTourStops(tourId: number | undefined) {
    return useQuery({
        queryKey: queryKeys.tours.stops(tourId!),
        queryFn: async () => {
            const response = await tourStopsApi.getTourStops(tourId!);
            return response.result;
        },
        enabled: !!tourId,
        staleTime: STALE_TIME.TOURS,
    });
}

export function useAddTourStop() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tourId, data }: { tourId: number; data: TourStopRequest }) =>
            tourStopsApi.addStop(tourId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.stops(variables.tourId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.detail(variables.tourId) });
        },
    });
}

export function useReorderTourStops() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tourId, data }: { tourId: number; data: TourStopReorderRequest }) =>
            tourStopsApi.reorderStops(tourId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.stops(variables.tourId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.detail(variables.tourId) });
        },
    });
}

export function useDeleteTourStop() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tourId, stopId }: { tourId: number; stopId: number }) =>
            tourStopsApi.deleteStop(tourId, stopId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.stops(variables.tourId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.detail(variables.tourId) });
        },
    });
}

export function useCheckIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CheckInRequest) => checkInsApi.createCheckIn(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
        },
    });
}

export function useMyCheckIns(params: CheckInSearchParams = {}) {
    return useQuery({
        queryKey: queryKeys.checkIns.list(params),
        queryFn: async () => {
            const response = await checkInsApi.getMyCheckIns(params);
            return response.result;
        },
        staleTime: STALE_TIME.TOURS,
    });
}
