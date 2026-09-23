/**
 * Channel Service
 * Provides channels list using the real backend API
 */
import { conversationsApi } from '@/features/chat/api';
import type { ConversationResponse } from '@/shared/types/backend.types';
import type { Channel, ChannelsResponse } from '../types/message.types';

/**
 * Format time label from timestamp
 */
function formatTimeLabel(timestamp: string | undefined): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Hôm qua';
  } else if (diffDays < 7) {
    return `${diffDays} ngày`;
  } else {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
}

/**
 * Map ConversationResponse from API to Channel type for UI
 */
function mapToChannel(apiConversation: ConversationResponse): Channel {
  return {
    id: apiConversation.id || '',
    name: apiConversation.name || 'Kênh',
    avatarUrl: apiConversation.avatarUrl,
    memberCount: 0, // Not available in ConversationResponse, will need separate API call
    lastMessage: {
      senderName: '',
      content: apiConversation.lastMessage || '',
      timestamp: apiConversation.lastMessageTime || new Date().toISOString(),
    },
    unreadCount: apiConversation.unreadCount || 0,
    timeLabel: formatTimeLabel(apiConversation.lastMessageTime),
  };
}

/**
 * Real API service for channels
 */
export const channelService = {
  getChannels: async (params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<ChannelsResponse> => {
    try {
      const response = await conversationsApi.getChannelConversations({
        page: params.page - 1, // API uses 0-indexed pages
        size: params.limit,
      });

      const conversations = response.result?.content || [];
      let mappedData = conversations.map(mapToChannel);

      // Client-side search filter (if API doesn't support search)
      if (params.search && params.search.trim()) {
        const searchLower = params.search.toLowerCase().trim();
        mappedData = mappedData.filter(
          (channel) =>
            channel.name.toLowerCase().includes(searchLower) ||
            channel.lastMessage.content.toLowerCase().includes(searchLower)
        );
      }

      return {
        data: mappedData,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: response.result?.numberOfElements || mappedData.length,
          hasMore: !response.result?.last,
        },
      };
    } catch (error) {
      console.error('[Channel Service] Error fetching channels:', error);
      return {
        data: [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 0,
          hasMore: false,
        },
      };
    }
  },
};
