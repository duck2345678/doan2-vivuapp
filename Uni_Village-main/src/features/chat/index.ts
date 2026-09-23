/**
 * Chat feature barrel export
 * Direct messaging functionality
 */

// Components
export * from './components';

// Hooks
export * from './hooks';

// Store
export {
    useActiveConversationId, useChatStore, useIsAnyoneTyping, useSocketStatus,
    useTypingUsersList, type SocketStatus,
    type TypingUserInfo
} from './store';

// Types
export type {
    ChatThread, Message, MessageSender, MessageStatus, MessageType, MessagesResponse, OnlineStatus, SendMessageInput, SharedCard, SharedCardMessage as SharedCardMessageType, TextMessage, ThreadPeer, ThreadResponse
} from './types';

// Services (internal use only, but exported for testing)
export * from './services';

