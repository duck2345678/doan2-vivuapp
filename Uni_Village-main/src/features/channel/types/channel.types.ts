/**
 * Channel feature types
 */

// Re-export shared types for convenience
export type { ChannelInfo, ChannelInvite, ChannelMember } from "@/shared/types";

/**
 * Response type for channel info query
 */
export interface ChannelInfoResponse {
  data: import("@/shared/types").ChannelInfo;
}

/**
 * Join channel mutation response
 */
export interface JoinChannelResponse {
  success: boolean;
  channelId: string;
}

/**
 * Channel invite payload for messages
 * Used when sharing channel invite via DM
 */
export interface ChannelInvitePayload {
  /** Numeric channel ID */
  channelId: string;
  /** Conversation ID for navigation */
  conversationId: string;
  /** Invite code for joining */
  inviteCode: string;
  /** Channel name */
  name: string;
  /** Channel emoji */
  emoji?: string;
  /** Channel description */
  description: string;
  /** Current member count */
  memberCount: number;
  /** Channel avatar URL */
  avatarUrl?: string;
  /** Name of the person who sent the invite */
  inviterName: string;
}
