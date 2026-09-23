/**
 * Members Service
 * Provides group member data using the real backend API
 */
import type { ChannelMemberResponse } from '@/shared/types/backend.types';
import { channelsApi } from '../api';
import type { GroupMember, UserPreview } from '../types';

/**
 * Map ChannelMemberResponse to GroupMember type
 */
function mapChannelMemberToGroupMember(member: ChannelMemberResponse): GroupMember {
    return {
        id: member.userId?.toString() || '',
        displayName: member.userName || 'Thành viên',
        avatarUrl: member.avatarUrl,
        isOnline: false, // Online status is managed via presence service
        role: member.role === 'ADMIN' ? 'admin' : 'member',
    };
}

/**
 * Fetch group members from API
 * @param conversationId - Conversation identifier
 */
export async function fetchGroupMembers(conversationId: string): Promise<GroupMember[]> {
    try {
        // First get the channel ID from conversation ID
        const channelResponse = await channelsApi.getChannelByConversation(conversationId);
        const channel = channelResponse.result;

        if (!channel?.id) {
            console.warn('[Members Service] Channel not found for conversation:', conversationId);
            return [];
        }

        // Then fetch members
        const membersResponse = await channelsApi.getChannelMembers(channel.id);
        const members = membersResponse.result || [];

        return members.map(mapChannelMemberToGroupMember);
    } catch (error) {
        console.error('[Members Service] Error fetching group members:', error);
        return [];
    }
}

/**
 * Get suggested users for adding to group
 * TODO: Implement when backend provides user search API
 */
export async function fetchSuggestedUsers(): Promise<UserPreview[]> {
    // TODO: Implement with real API when available
    return [];
}

/**
 * Search users by phone or display name
 * TODO: Implement when backend provides user search API
 */
export async function searchUsersByPhone(query: string): Promise<UserPreview[]> {
    // TODO: Implement with real API when available
    if (!query.trim()) {
        return fetchSuggestedUsers();
    }
    return [];
}
