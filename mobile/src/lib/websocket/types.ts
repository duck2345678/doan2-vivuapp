import type {
    MessageResponse,
    MessageType,
} from "@/shared/types/backend.types";

/**
 * Combined message response type for WebSocket events.
 * Backend may send either MessageResponse or FileMessageResponse
 * depending on messageType (TEXT vs IMAGE/FILE).
 */
export type WsMessageData = MessageResponse & {
  fileUrls?: string[];
};

export type WebSocketEventType =
  | "SEND"
  | "EDIT"
  | "UNSEND"
  | "SEEN"
  | "DELIVERED"
  | "TYPING"
  | "CHANNEL_CHANGED"
  | "CHANNEL_CREATED"
  | "MEMBER_ADDED"
  | "COMMENT_CHANGED"
  | "REACTION_CHANGED"
  | "POST_CHANGED"
  | "SEND_JOIN_REQUEST"
  | "ACCEPT_JOIN_REQUEST"
  | "REJECT_JOIN_REQUEST"
  | "USER_ONLINE"
  | "USER_OFFLINE"
  | "ACK"
  | "MESSAGE_REQUEST"
  | "CONVERSATION_UPGRADED";

export interface WebSocketMessage<T = unknown> {
  eventType: WebSocketEventType;
  data: T;
}

export interface TypingEvent {
  userId: number;
  userName: string;
  conversationId: string;
  isTyping: boolean;
}

export interface ReadReceiptEvent {
  userId: number;
  conversationId: string;
  messageId: number;
}

/**
 * @deprecated Use ChatMessageWsEvent discriminated union instead.
 * Backend sends data directly, not wrapped in .message
 */
export interface MessageEvent {
  message: MessageResponse;
}

// ========== Discriminated Union Types for Chat WS Events ==========

/**
 * SEEN event payload - backend sends userId + lastReadMessageId
 */
export interface SeenEventData {
  userId: number;
  lastReadMessageId: number;
}

/**
 * Discriminated union for chat message WebSocket events.
 * Backend sends data directly in wsMessage.data (not wrapped in .message)
 */
export type ChatMessageWsEvent =
  | { eventType: "SEND"; data: WsMessageData }
  | { eventType: "EDIT"; data: WsMessageData }
  | { eventType: "UNSEND"; data: WsMessageData }
  | { eventType: "SEEN"; data: SeenEventData };

export type WebSocketTopic =
  | { type: "conversation"; conversationId: string }
  | { type: "channel"; conversationId: string }
  | { type: "post-comments"; postId: number }
  | { type: "post-reactions"; postId: number }
  | { type: "user-queue" }
  | { type: "user-messages" }
  | { type: "user-ack" }
  | { type: "user-events" }
  | { type: "force-logout" };

/**
 * Event sent by admin to force user logout
 */
export interface ForceLogoutEvent {
  type: "ACCOUNT_LOCKED" | "SESSION_EXPIRED" | "SECURITY_BREACH";
  reason: string;
  userId: number;
}

export interface WebSocketConfig {
  url: string;
  accessToken: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export interface StompSubscription {
  id: string;
  topic: string;
  unsubscribe: () => void;
}

// ========== Chat System DTOs ==========

/**
 * ACK status for message delivery confirmation
 */
export type AckStatus = "DELIVERED" | "DUPLICATE" | "BLOCKED" | "ERROR";

/**
 * ACK event sent to sender after message processing
 */
export interface AckEvent {
  clientMessageId: string;
  realMessageId?: number;
  conversationId?: string;
  status: AckStatus;
  errorMessage?: string;
}

/**
 * Participant status in a conversation
 */
export type ParticipantStatus = "INBOX" | "REQUEST" | "ARCHIVED" | "DELETED";

/**
 * Chat message event sent to recipient via user queue
 */
export interface ChatMessageEvent {
  id: number;
  clientMessageId: string;
  conversationId: string;
  senderId: number;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  messageType: MessageType;
  replyToId?: number;
  timestamp: string;
  /** True if this is a message request (sender is not a friend) */
  isRequest: boolean;
  /** True if this creates a new conversation */
  isNewConversation: boolean;
}

/**
 * Reason for conversation upgrade
 */
export type UpgradeReason = "MESSAGE_REQUEST_ACCEPTED" | "FRIEND_ADDED";

/**
 * Event when conversation upgrades from REQUEST -> INBOX
 */
export interface ConversationUpgradedEvent {
  conversationId: string;
  newStatus: ParticipantStatus;
  reason: UpgradeReason;
}

/**
 * Channel event payload for CHANNEL_CREATED and MEMBER_ADDED events
 * Minimal data to trigger conversation list refresh
 */
export interface ChannelEventPayload {
  channelId: number;
  conversationId: string;
  channelName: string;
}

/**
 * Union type for user queue events (conversation upgrade or channel events)
 */
export type UserQueueEvent =
  | { eventType: "CONVERSATION_UPGRADED"; data: ConversationUpgradedEvent }
  | { eventType: "CHANNEL_CREATED"; data: ChannelEventPayload }
  | { eventType: "MEMBER_ADDED"; data: ChannelEventPayload };

/**
 * Payload for sending a message via WebSocket
 */
export interface ChatSendPayload {
  recipientId: number;
  content: string;
  clientMessageId: string;
  replyToId?: number;
}
