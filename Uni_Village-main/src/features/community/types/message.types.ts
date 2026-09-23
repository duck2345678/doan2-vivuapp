/**
 * Message feature types
 * Types for inbox conversations and channels
 */

/**
 * Sub-tab options within the Messages section
 */
export type MessagesSubTab = 'inbox' | 'channels';

/**
 * Participant in a direct conversation
 */
export interface ConversationParticipant {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

/**
 * Last message preview in a conversation
 */
export interface LastMessage {
  content: string;
  timestamp: string;
  isRead: boolean;
}

/**
 * Direct message conversation preview
 */
export interface Conversation {
  id: string;
  participant: ConversationParticipant;
  lastMessage: LastMessage;
  unreadCount: number;
  /** Formatted time label: "10:30", "Hôm qua", "2 ngày" */
  timeLabel: string;
}

/**
 * Last message in a channel (includes sender name)
 */
export interface ChannelLastMessage {
  senderName: string;
  content: string;
  timestamp: string;
}

/**
 * Group channel preview
 */
export interface Channel {
  id: string;
  name: string;
  avatarUrl?: string;
  memberCount: number;
  lastMessage: ChannelLastMessage;
  unreadCount: number;
  /** Formatted time label: "10:30", "Hôm qua", "2 ngày" */
  timeLabel: string;
}

/**
 * Response type for conversations list
 */
export interface ConversationsResponse {
  data: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Response type for channels list
 */
export interface ChannelsResponse {
  data: Channel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
