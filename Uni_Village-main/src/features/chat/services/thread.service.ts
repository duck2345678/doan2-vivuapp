/**
 * Thread Service
 * Provides thread/conversation data using the real backend API
 */
import { profileApi } from '@/features/profile/api/profileApi';
import type { ChannelResponse, ConversationResponse } from '@/shared/types/backend.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { channelsApi, conversationsApi, friendsApi } from '../api';
import type { ChatThread, GroupThread, ThreadInfo, ThreadResponse } from '../types';

/**
 * Check if a thread ID is a virtual thread (user-{userId})
 */
export function isVirtualThreadId(threadId: string): boolean {
    return threadId.startsWith('user-');
}

/**
 * Extract user ID from virtual thread ID
 */
export function extractUserIdFromVirtualThread(threadId: string): number | null {
    if (!isVirtualThreadId(threadId)) return null;
    const userId = threadId.replace('user-', '');
    return parseInt(userId, 10);
}

/**
 * Check if a thread ID belongs to a group/channel
 * Channels typically use UUID format from the backend
 */
export function isGroupThreadId(threadId: string): boolean {
    // In the new API, we determine thread type by checking if it's a channel
    // Channel conversation IDs are UUIDs, same as DM conversation IDs
    // The distinction is made by the conversation type returned from the API
    // For backwards compatibility, also check for old prefixes
    return threadId.startsWith('group-') || threadId.startsWith('channel-');
}

/**
 * Map ConversationResponse to ChatThread type for DM
 */
function mapConversationToThread(conversation: ConversationResponse): ChatThread {
    return {
        id: conversation.id || '',
        type: 'dm',
        peer: {
            id: String(conversation.otherUserId || conversation.id),
            displayName: conversation.name || 'Người dùng',
            avatarUrl: conversation.avatarUrl,
        },
        onlineStatus: 'offline',
        onlineStatusText: 'Offline',
        relationshipStatus: conversation.relationshipStatus,
        participantStatus: conversation.participantStatus,
    };
}

/**
 * Map ChannelResponse to GroupThread type for groups/channels
 */
function mapChannelToThread(channel: ChannelResponse): GroupThread {
    return {
        id: channel.conversationId || '',
        type: 'group',
        name: channel.name || 'Kênh',
        avatarUrl: channel.avatarUrl,
        memberCount: channel.memberCount || 0,
        onlineCount: 0, // Not available from API, can be updated via presence
        channelId: channel.id,
    };
}

/**
 * Fetch DM thread metadata from API
 * @param conversationId - Conversation identifier
 */
export async function fetchThread(conversationId: string): Promise<ThreadResponse> {
    try {
        // Get private conversations to find the specific one
        const response = await conversationsApi.getPrivateConversations({ page: 0, size: 100 });
        const conversations = response.result?.content || [];
        const conversation = conversations.find(c => c.id === conversationId);

        if (conversation) {
            return { thread: mapConversationToThread(conversation) };
        }

        // Fallback: return a default thread with the conversation ID
        return {
            thread: {
                id: conversationId,
                type: 'dm',
                peer: {
                    id: conversationId,
                    displayName: 'Người dùng',
                    avatarUrl: undefined,
                },
                onlineStatus: 'offline',
                onlineStatusText: 'Offline',
            },
        };
    } catch (error) {
        console.error('[Thread Service] Error fetching thread:', error);
        // Return fallback on error
        return {
            thread: {
                id: conversationId,
                type: 'dm',
                peer: {
                    id: conversationId,
                    displayName: 'Người dùng',
                    avatarUrl: undefined,
                },
                onlineStatus: 'offline',
                onlineStatusText: 'Offline',
            },
        };
    }
}

/**
 * Fetch virtual thread metadata from user profile
 * @param userId - User ID
 */
export async function fetchVirtualThread(userId: number): Promise<ThreadResponse> {
    try {
        const [profile, relationshipStatus] = await Promise.all([
            profileApi.getProfile(userId),
            friendsApi.getRelationshipStatus(userId).catch(() => ({ status: 'NONE' as const }))
        ]);

        return {
            thread: {
                id: `user-${userId}`,
                type: 'dm',
                peer: {
                    id: String(userId),
                    displayName: profile.displayName || profile.username || 'Người dùng',
                    avatarUrl: profile.avatarUrl,
                },
                onlineStatus: 'offline',
                onlineStatusText: 'Offline',
                relationshipStatus: relationshipStatus.status,
                participantStatus: 'INBOX',
            },
        };
    } catch (error) {
        console.error('[Thread Service] Error fetching virtual thread:', error);
        return {
            thread: {
                id: `user-${userId}`,
                type: 'dm',
                peer: {
                    id: String(userId),
                    displayName: 'Người dùng',
                    avatarUrl: undefined,
                },
                onlineStatus: 'offline',
                onlineStatusText: 'Offline',
                relationshipStatus: 'NONE',
                participantStatus: 'INBOX',
            },
        };
    }
}

/**
 * Fetch group/channel thread metadata from API
 * @param conversationId - Conversation identifier
 */
export async function fetchGroupThread(conversationId: string): Promise<ThreadResponse | null> {
    try {
        // Try to get channel info by conversation ID
        const response = await channelsApi.getChannelByConversation(conversationId);
        const channel = response.result;

        if (channel) {
            return { thread: mapChannelToThread(channel) };
        }

        return null;
    } catch (error) {
        console.error('[Thread Service] Error fetching group thread:', error);
        return null;
    }
}

/**
 * Fetch thread info for info sidebar
 * @param threadId - Thread identifier
 */
export async function fetchThreadInfo(threadId: string): Promise<ThreadInfo> {
    try {
        // Get conversation details
        const response = await conversationsApi.getPrivateConversations({ page: 0, size: 100 });
        const conversations = response.result?.content || [];
        const conversation = conversations.find(c => c.id === threadId);

        if (!conversation || !conversation.otherUserId) {
            throw new Error('Conversation not found');
        }

        const otherUserId = conversation.otherUserId;

        // Fetch user profile and media in parallel
        const [profile, mediaResponse, muteStatus] = await Promise.all([
            profileApi.getProfile(otherUserId),
            conversationsApi.getConversationMedia(threadId).catch(() => ({ result: [] })),
            getMuteStatus(threadId),
        ]);

        const mediaList = mediaResponse.result || [];

        return {
            threadId,
            peerId: String(otherUserId),
            peerName: profile.displayName || profile.username || 'Người dùng',
            peerAvatarUrl: profile.avatarUrl,
            isMuted: muteStatus,
            isBlocked: false, // TODO: Implement block status from backend
            sentMediaCount: mediaList.length,
        };
    } catch (error) {
        console.error('[Thread Service] Error fetching thread info:', error);
        throw error;
    }
}

/**
 * Get mute status from local storage
 * @param threadId - Thread identifier
 */
async function getMuteStatus(threadId: string): Promise<boolean> {
    try {
        const key = `mute_${threadId}`;
        const value = await AsyncStorage.getItem(key);
        return value === 'true';
    } catch (error) {
        console.error('[Thread Service] Error getting mute status:', error);
        return false;
    }
}

/**
 * Set mute status in local storage
 * @param threadId - Thread identifier
 * @param isMuted - Mute status
 */
async function setMuteStatus(threadId: string, isMuted: boolean): Promise<void> {
    try {
        const key = `mute_${threadId}`;
        await AsyncStorage.setItem(key, String(isMuted));
    } catch (error) {
        console.error('[Thread Service] Error setting mute status:', error);
        throw error;
    }
}

/**
 * Toggle thread mute status
 * @param threadId - Thread identifier
 */
export async function toggleThreadMute(threadId: string): Promise<boolean> {
    try {
        const currentStatus = await getMuteStatus(threadId);
        const newStatus = !currentStatus;
        await setMuteStatus(threadId, newStatus);
        return newStatus;
    } catch (error) {
        console.error('[Thread Service] Error toggling mute:', error);
        throw error;
    }
}
