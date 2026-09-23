/**
 * Inbox Service
 * Provides inbox conversations using the real backend API
 */
import { conversationsApi } from '@/features/chat/api';
import type { ConversationResponse } from '@/shared/types/backend.types';
import type { Conversation, ConversationsResponse } from '../types/message.types';

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
    // Today - show time
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
 * Map ConversationResponse from API to Conversation type for UI
 */
function mapToConversation(apiConversation: ConversationResponse): Conversation {
  return {
    id: apiConversation.id || '',
    participant: {
      id: apiConversation.id || '',
      displayName: apiConversation.name || 'Người dùng',
      avatarUrl: apiConversation.avatarUrl,
    },
    lastMessage: {
      content: apiConversation.lastMessage || '',
      timestamp: apiConversation.lastMessageTime || new Date().toISOString(),
      isRead: (apiConversation.unreadCount || 0) === 0,
    },
    unreadCount: apiConversation.unreadCount || 0,
    timeLabel: formatTimeLabel(apiConversation.lastMessageTime),
  };
}

/**
 * Real API service for inbox conversations
 */
export const inboxService = {
  getConversations: async (params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<ConversationsResponse> => {
    try {
      const response = await conversationsApi.getPrivateConversations({
        page: params.page - 1, // API uses 0-indexed pages
        size: params.limit,
      });

      const conversations = response.result?.content || [];
      
      // Filter out conversations with no messages (empty conversations)
      const conversationsWithMessages = conversations.filter(
        (conv) => conv.lastMessage && conv.lastMessage.trim() !== ''
      );
      
      let mappedData = conversationsWithMessages.map(mapToConversation);

      // Client-side search filter (if API doesn't support search)
      if (params.search && params.search.trim()) {
        const searchLower = params.search.toLowerCase().trim();
        mappedData = mappedData.filter(
          (conv) =>
            conv.participant.displayName.toLowerCase().includes(searchLower) ||
            conv.lastMessage.content.toLowerCase().includes(searchLower)
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
      console.error('[Inbox Service] Error fetching conversations:', error);
      // Return empty result on error
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
