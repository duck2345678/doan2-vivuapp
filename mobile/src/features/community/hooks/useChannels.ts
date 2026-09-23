import { useQuery } from '@tanstack/react-query';

import { channelService } from '../services/channels.service';
import type { ChannelsResponse } from '../types/message.types';

const CHANNELS_KEY = ['community', 'channels'];

/**
 * Hook to fetch channels with search filtering
 */
export function useChannels(
  page = 1,
  limit = 20,
  search?: string
) {
  return useQuery<ChannelsResponse>({
    queryKey: [...CHANNELS_KEY, { page, limit, search }],
    queryFn: () => channelService.getChannels({ page, limit, search }),
  });
}
