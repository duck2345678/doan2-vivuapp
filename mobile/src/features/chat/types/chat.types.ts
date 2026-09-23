/**
 * Chat feature types
 * Types for chat threads, messages, and shared content
 */

/**
 * Thread type discriminator
 */
export type ThreadType = "dm" | "group";

/**
 * Message sender type
 */
export type MessageSender = "me" | "other" | "system";

/**
 * Message type discriminator
 */
export type MessageType =
  | "text"
  | "sharedCard"
  | "image"
  | "system"
  | "channelInvite";

/**
 * Message delivery status
 */
export type MessageStatus = "sending" | "sent" | "delivered" | "read";

/**
 * Base message interface
 */
interface BaseMessage {
  id: string;
  sender: MessageSender;
  createdAt: string;
  /** Formatted time label: "10:30", "10:31" */
  timeLabel: string;
  status?: MessageStatus;
  /** Sender info for group chats */
  senderName?: string;
  senderAvatar?: string;
  /** Backend message ID for actions like unsend */
  messageId?: number;
  /** Conversation ID for cache updates */
  conversationId?: string;
  /** Whether message has been unsent/deleted */
  isUnsent?: boolean;
}

/**
 * Text message
 */
export interface TextMessage extends BaseMessage {
  type: "text";
  text: string;
}

/**
 * Shared content card (e.g., itinerary)
 */
export interface SharedCard {
  id: string;
  title: string;
  imageUrl: string;
  ctaText: string;
  /** Route to navigate when tapped */
  route: string;
}

/**
 * Shared card message
 */
export interface SharedCardMessage extends BaseMessage {
  type: "sharedCard";
  card: SharedCard;
}

/**
 * Image message
 */
export interface ImageMessage extends BaseMessage {
  type: "image";
  imageUrl: string;
  caption?: string;
}

/**
 * System message (e.g., "X added Y to the group")
 */
export interface SystemMessage extends BaseMessage {
  type: "system";
  text: string;
}

/**
 * Channel invite payload for messages
 */
export interface ChannelInviteData {
  channelId: string;
  conversationId: string;
  inviteCode: string;
  name: string;
  emoji?: string;
  description: string;
  memberCount: number;
  avatarUrl?: string;
  inviterName: string;
}

/**
 * Channel invite message
 */
export interface ChannelInviteMessage extends BaseMessage {
  type: "channelInvite";
  invite: ChannelInviteData;
}

/**
 * Union type for all message types
 */
export type Message =
  | TextMessage
  | SharedCardMessage
  | ImageMessage
  | SystemMessage
  | ChannelInviteMessage;

/**
 * Chat thread peer information
 */
export interface ThreadPeer {
  id: number;
  displayName: string;
  avatarUrl?: string;
}

/**
 * Online status for a peer
 */
export type OnlineStatus = "online" | "offline" | "away";

/**
 * Chat thread metadata
 */
export interface ChatThread {
  id: string;
  type: ThreadType;
  peer: ThreadPeer;
  onlineStatus: OnlineStatus;
  /** Localized online status text: "Đang hoạt động", "Offline", etc. */
  onlineStatusText: string;
  /** Relationship status with the other user (for DM chats) */
  relationshipStatus?:
    | "NONE"
    | "PENDING_OUTGOING"
    | "PENDING_INCOMING"
    | "ACCEPTED"
    | "BLOCKED"
    | "BLOCKED_BY"
    | "FRIEND";
  /** Participant status (INBOX/REQUEST) */
  participantStatus?: "INBOX" | "REQUEST" | "ARCHIVED" | "DELETED";
}

/**
 * Pinned message in a group chat
 */
export interface PinnedMessage {
  id: string;
  text: string;
  pinnedBy: string;
  pinnedAt: string;
}

/**
 * Group chat thread extends base ChatThread
 */
export interface GroupThread extends Omit<
  ChatThread,
  "peer" | "onlineStatus" | "onlineStatusText"
> {
  type: "group";
  name: string;
  avatarUrl?: string;
  memberCount: number;
  onlineCount: number;
  channelId?: number;
  pinnedMessage?: PinnedMessage;
}

/**
 * Group member info
 */
export interface GroupMember {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
  role: "admin" | "member";
}

/**
 * User preview for search/suggestions
 */
export interface UserPreview {
  id: number;
  displayName: string;
  avatarUrl?: string;
  phone?: string;
}

/**
 * User search result with relationship status
 * Used for user search in messages tab
 */
export interface UserSearchResult {
  id: number;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  relationshipStatus:
    | "NONE"
    | "PENDING_OUTGOING"
    | "PENDING_INCOMING"
    | "ACCEPTED"
    | "BLOCKED"
    | "BLOCKED_BY";
}

/**
 * Union type for thread (DM or Group)
 */
export type Thread = ChatThread | GroupThread;

/**
 * Type guard for group thread
 */
export function isGroupThread(thread: Thread): thread is GroupThread {
  return thread.type === "group";
}

/**
 * Response type for fetching thread info
 */
export interface ThreadResponse {
  thread: Thread;
}

/**
 * Response type for fetching messages
 */
export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

/**
 * Input for sending a new message
 */
export interface SendMessageInput {
  threadId: string;
  text: string;
}
