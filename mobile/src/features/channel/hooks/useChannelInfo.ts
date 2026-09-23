/**
 * useChannelInfo Hook
 * Fetches channel information using React Query
 */

import { useQuery } from '@tanstack/react-query';

import type { ChannelInfo } from '@/shared/types';
import { channelInfoService } from '../services';
import { channelQueryKeys } from './channelQueryKeys';

const STALE_TIME = 30 * 1000;

/**
 * Hook to fetch channel info by ID
 */
export function useChannelInfo(channelId: string) {
    return useQuery<ChannelInfo | null>({
        queryKey: channelQueryKeys.info(channelId),
        queryFn: () => channelInfoService.getChannelInfo(channelId),
        enabled: !!channelId,
        staleTime: STALE_TIME,
        // refetchInterval: 5000, // Removed in favor of WebSocket updates
    });
}
