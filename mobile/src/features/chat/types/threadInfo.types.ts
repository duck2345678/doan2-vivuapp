/**
 * Thread Info Types
 * Types for chat thread info screen and sent media gallery
 */

/**
 * Thread info data for a DM conversation
 */
export interface ThreadInfo {
  /** Thread ID */
  threadId: string;
  /** Peer user ID */
  peerId: string;
  /** Peer display name */
  peerName: string;
  /** Peer avatar URL */
  peerAvatarUrl?: string;
  /** Whether notifications are muted */
  isMuted: boolean;
  /** Whether the user is blocked */
  isBlocked: boolean;
  /** Total number of sent media items */
  sentMediaCount: number;
}

/**
 * Media item sent in the chat
 */
export interface MediaItem {
  /** Unique media ID */
  id: string;
  /** Media URL */
  url: string;
  /** Thumbnail URL (for video) */
  thumbnailUrl?: string;
  /** Media type */
  type: 'image' | 'video';
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** When the media was sent */
  sentAt: string;
}

/**
 * Sent media response with pagination
 */
export interface SentMediaResponse {
  data: MediaItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Thread info action types
 */
export type ThreadInfoAction =
  | 'search'
  | 'profile'
  | 'mute'
  | 'report'
  | 'block'
  | 'archive'
  | 'delete';

/**
 * Thread info option row data
 */
export interface ThreadInfoOption {
  id: ThreadInfoAction;
  label: string;
  icon: string;
  variant?: 'default' | 'danger';
}
