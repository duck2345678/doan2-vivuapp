/**
 * Channel Info Service
 * Fetches channel data from backend APIs and maps to UI models.
 */

import { useAuthStore } from '@/features/auth/store/authStore';
import { channelsApi, conversationsApi, type CreateChannelFormData, type UpdateChannelFormData } from '@/features/chat/api';
import type { ChannelInfo, ChannelMember } from '@/shared/types';
import type {
    ChannelMemberResponse,
    ChannelResponse,
    JoinConversationResponse,
} from '@/shared/types/backend.types';

const MEMBER_NAME_FALLBACK = 'Channel member';
const CREATOR_NAME_FALLBACK = 'Channel creator';

const isNumericId = (value: string) => /^\d+$/.test(value.trim());

const getCurrentUserId = () => {
    const user = useAuthStore.getState().user;
    return user?.id ?? user?.userId ?? null;
};

const mapMembers = (members: ChannelMemberResponse[]): ChannelMember[] =>
    members.map((member) => ({
        id: member.userId?.toString() ?? '',
        displayName: member.userName ?? MEMBER_NAME_FALLBACK,
        avatarUrl: member.avatarUrl,
    }));

const resolveCreator = (channel: ChannelResponse, members: ChannelMemberResponse[]) => {
    const creatorMember = members.find((member) => member.userId === channel.creatorId);
    
    // Try to resolve name from member list, or current user if they are the creator
    let displayName = creatorMember?.userName;
    
    if (!displayName) {
        const currentUser = useAuthStore.getState().user;
        const currentUserId = currentUser?.id ?? currentUser?.userId;
        if (currentUserId === channel.creatorId && currentUser?.displayName) {
            displayName = currentUser.displayName;
        }
    }

    return {
        id: creatorMember?.userId?.toString() ?? channel.creatorId?.toString() ?? '',
        displayName: displayName ?? CREATOR_NAME_FALLBACK,
    };
};

const mapChannelInfo = (
    channel: ChannelResponse,
    members: ChannelMemberResponse[],
    fallbackId: string
): ChannelInfo => {
    const mappedMembers = mapMembers(members);
    const currentUserId = getCurrentUserId();
    const isJoined = currentUserId
        ? members.some((member) => member.userId === currentUserId)
        : false;
    
    // Check if current user is admin (owner or has ADMIN role)
    const currentUserMember = currentUserId
        ? members.find((member) => member.userId === currentUserId)
        : null;
    const isAdmin =
        currentUserId === channel.creatorId ||
        currentUserMember?.role === 'OWNER' ||
        currentUserMember?.role === 'ADMIN';

    return {
        id: channel.conversationId ?? fallbackId ?? channel.id?.toString() ?? '',
        channelId: channel.id,
        name: channel.name ?? 'Channel',
        description: channel.description ?? '',
        memberCount: channel.memberCount ?? mappedMembers.length,
        iconUrl: channel.avatarUrl,
        previewImageUrl: channel.avatarUrl,
        category: channel.category as ChannelInfo['category'],
        inviteCode: channel.inviteCode,
        allowSharing: channel.allowSharing,
        isAdmin,
        creator: resolveCreator(channel, members),
        members: mappedMembers,
        isJoined,
    };
};

const getMembersSafe = async (channelId?: number): Promise<ChannelMemberResponse[]> => {
    if (!channelId) return [];
    try {
        const response = await channelsApi.getChannelMembers(channelId);
        return response.result ?? [];
    } catch (error) {
        console.warn('[ChannelInfoService] Failed to fetch members:', error);
        return [];
    }
};

const getChannelById = async (channelId: number): Promise<ChannelResponse | null> => {
    const response = await channelsApi.getChannel(channelId);
    return response.result ?? null;
};

const getChannelByConversation = async (conversationId: string): Promise<ChannelResponse | null> => {
    try {
        const response = await channelsApi.getChannelByConversation(conversationId);
        return response.result ?? null;
    } catch (error: any) {
        // If 404, it might be a private channel or user not member.
        // We return null so the caller can handle it (e.g. show empty state or fallback).
        if (error?.status === 404 || error?.response?.status === 404) {
            return null;
        }
        console.warn('[ChannelInfoService] Failed to fetch channel by conversation:', error);
        return null;
    }
};

export const channelInfoService = {
    getChannelInfo: async (channelId: string): Promise<ChannelInfo | null> => {
        const trimmedId = channelId.trim();
        if (!trimmedId) return null;

        if (isNumericId(trimmedId)) {
            const numericId = Number(trimmedId);
            const [channel, members] = await Promise.all([
                getChannelById(numericId),
                getMembersSafe(numericId),
            ]);
            if (channel) {
                return mapChannelInfo(channel, members, trimmedId);
            }
            const fallbackChannel = await getChannelByConversation(trimmedId);
            if (!fallbackChannel) return null;
            const fallbackMembers = await getMembersSafe(fallbackChannel.id ?? undefined);
            return mapChannelInfo(fallbackChannel, fallbackMembers, trimmedId);
        }

        const channel = await getChannelByConversation(trimmedId);
        if (!channel) return null;
        const members = await getMembersSafe(channel.id ?? undefined);
        return mapChannelInfo(channel, members, trimmedId);
    },

    createChannel: (data: CreateChannelFormData) => channelsApi.createChannel(data),
    updateChannel: (channelId: number, data: UpdateChannelFormData) =>
        channelsApi.updateChannel(channelId, data),
    deleteChannel: (conversationId: string) => conversationsApi.deleteConversation(conversationId),
    joinChannel: async (conversationId: string): Promise<JoinConversationResponse | undefined> => {
        if (!conversationId) {
            throw new Error('Missing conversation id');
        }
        const response = await conversationsApi.joinConversation(conversationId);
        return response.result as JoinConversationResponse | undefined;
    },
    leaveChannel: async (conversationId: string): Promise<string | undefined> => {
        if (!conversationId) {
            throw new Error('Missing conversation id');
        }
        const response = await conversationsApi.deleteConversation(conversationId);
        return response.result;
    },
};
