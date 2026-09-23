/**
 * useFeed Hook
 * Hook for fetching feed data
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { feedApi } from '../api/feedApi';
import type { FeedResponse } from '../types';

export function useFeed() {
    const query = useInfiniteQuery<FeedResponse>({
        queryKey: ['feed'],
        queryFn: ({ pageParam = 0 }) => feedApi.getFeed({ page: pageParam as number, size: 20 }),
        getNextPageParam: (lastPage) =>
            lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
        initialPageParam: 0,
        staleTime: 0, // Always considered stale - refetch on every navigation
        gcTime: 0, // Don't cache in garbage collection - always fresh data
    });

    const feedItems = useMemo(
        () => query.data?.pages.flatMap((page) => page.data) ?? [],
        [query.data]
    );

    return {
        feedItems,
        isLoading: query.isLoading,
        isFetchingNextPage: query.isFetchingNextPage,
        hasNextPage: query.hasNextPage,
        fetchNextPage: query.fetchNextPage,
        refetch: query.refetch,
        error: query.error,
    };
}
