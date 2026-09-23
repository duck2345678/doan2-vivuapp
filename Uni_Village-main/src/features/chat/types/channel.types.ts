/**
 * Channel Types
 * Types for channel creation and management
 */

/**
 * Channel category types
 */
export type ChannelCategory =
  | 'travel'
  | 'course'
  | 'food'
  | 'photography'
  | 'reading'
  | 'other';

/**
 * Channel category metadata with icon and label
 */
export interface ChannelCategoryInfo {
  id: ChannelCategory;
  label: string;
  icon: string; // MaterialIcons or Ionicons name
}

/**
 * All available channel categories
 */
export const CHANNEL_CATEGORIES: ChannelCategoryInfo[] = [
  { id: 'travel', label: 'Du lịch', icon: 'flight' },
  { id: 'course', label: 'Khóa học', icon: 'school' },
  { id: 'food', label: 'Ẩm thực', icon: 'restaurant' },
  { id: 'photography', label: 'Nhiếp ảnh', icon: 'camera-alt' },
  { id: 'reading', label: 'Đọc sách', icon: 'menu-book' },
  { id: 'other', label: 'Khác', icon: 'public' },
];

/**
 * Input for creating a new channel
 */
export interface CreateChannelInput {
  name: string;
  description?: string;
  category: ChannelCategory;
  allowSharing: boolean;
  isPrivate: boolean;
  memberIds: string[];
}

/**
 * Friend preview for member selection
 */
export interface FriendPreview {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
  statusText: string; // "Đang hoạt động" / "Không hoạt động"
}

/**
 * Response from create channel API
 */
export interface CreateChannelResponse {
  success: boolean;
  channelId: string;
  channel: {
    id: string;
    name: string;
    avatarUrl?: string;
    memberCount: number;
    category: ChannelCategory;
  };
}
