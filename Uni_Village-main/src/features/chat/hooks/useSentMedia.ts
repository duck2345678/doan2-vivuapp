/**
 * useSentMedia hook
 * Fetches sent media items for a chat thread
 */
import { useQuery } from '@tanstack/react-query';

import { fetchSentMedia, fetchSentMediaPreview } from '../services';
import type { MediaItem, SentMediaResponse } from '../types';

/**
 * Query key factory for sent media queries
 */
export const sentMediaKeys = {
  all: ['sentMedia'] as const,
  list: (threadId: string) => [...sentMediaKeys.all, 'list', threadId] as const,
  preview: (threadId: string) => [...sentMediaKeys.all, 'preview', threadId] as const,
  paginated: (threadId: string, page: number) =>
    [...sentMediaKeys.list(threadId), page] as const,
};

/**
 * Fetch and cache sent media preview (first 6 items)
 * @param threadId - Thread identifier
 */
export function useSentMediaPreview(threadId: string) {
  return useQuery<MediaItem[], Error>({
    queryKey: sentMediaKeys.preview(threadId),
    queryFn: () => fetchSentMediaPreview(threadId),
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch and cache sent media with pagination
 * @param threadId - Thread identifier
 * @param page - Page number (default 1)
 * @param limit - Items per page (default 20)
 */
export function useSentMedia(threadId: string, page: number = 1, limit: number = 20) {
  return useQuery<SentMediaResponse, Error>({
    queryKey: sentMediaKeys.paginated(threadId, page),
    queryFn: () => fetchSentMedia(threadId, page, limit),
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
