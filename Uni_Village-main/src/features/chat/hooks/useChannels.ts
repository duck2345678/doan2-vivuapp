import { queryKeys } from '@/config/queryKeys';
import type { AddChannelMemberRequest, ParticipantRole } from '@/shared/types/backend.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    channelsApi,
    type CreateChannelFormData,
    type DiscoverChannelsParams,
    type UpdateChannelFormData
} from '../api';

const STALE_TIME = 30 * 1000;

export function useChannel(channelId: number | undefined) {
    return useQuery({
        queryKey: queryKeys.channels.detail(channelId!),
        queryFn: async () => {
            const response = await channelsApi.getChannel(channelId!);
            return response.result;
        },
        enabled: !!channelId,
        staleTime: STALE_TIME,
    });
}

export function useChannelByConversation(conversationId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.channels.byConversation(conversationId!),
        queryFn: async () => {
            const response = await channelsApi.getChannelByConversation(conversationId!);
            return response.result;
        },
        enabled: !!conversationId,
        staleTime: STALE_TIME,
    });
}

export function useChannelMembers(channelId: number | undefined) {
    return useQuery({
        queryKey: queryKeys.channels.members(channelId!),
        queryFn: async () => {
            const response = await channelsApi.getChannelMembers(channelId!);
            return response.result;
        },
        enabled: !!channelId,
        staleTime: STALE_TIME,
    });
}

export function useCreateChannel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateChannelFormData) => channelsApi.createChannel(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
        },
    });
}

export function useUpdateChannel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ channelId, data }: { channelId: number; data: UpdateChannelFormData }) =>
            channelsApi.updateChannel(channelId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.channels.detail(variables.channelId),
            });
        },
    });
}

export function useAddChannelMembers() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ channelId, data }: { channelId: number; data: AddChannelMemberRequest }) =>
            channelsApi.addMembers(channelId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.channels.members(variables.channelId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.channels.detail(variables.channelId),
            });
        },
    });
}

export function useRemoveChannelMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ channelId, memberId }: { channelId: number; memberId: number }) =>
            channelsApi.removeMember(channelId, memberId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.channels.members(variables.channelId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.channels.detail(variables.channelId),
            });
        },
    });
}

export function useUpdateMemberRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            channelId,
            memberId,
            role,
        }: {
            channelId: number;
            memberId: number;
            role: ParticipantRole;
        }) => channelsApi.updateMemberRole(channelId, memberId, role),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.channels.members(variables.channelId),
            });
        },
    });
}

export function useChannelJoinRequests(channelId: number | undefined) {
    return useQuery({
        queryKey: queryKeys.channels.joinRequests(channelId!),
        queryFn: async () => {
            const response = await channelsApi.getJoinRequests(channelId!);
            return response.result;
        },
        enabled: !!channelId,
        staleTime: STALE_TIME,
    });
}

// ==================== DISCOVERY & INVITE HOOKS ====================

export function useDiscoverPublicChannels(params: DiscoverChannelsParams = {}) {
    return useQuery({
        queryKey: ['channels', 'public', params],
        queryFn: async () => {
            const response = await channelsApi.discoverPublicChannels(params);
            return response.result ?? [];
        },
        staleTime: STALE_TIME,
    });
}

export function useChannelByInviteCode(inviteCode: string | undefined) {
    return useQuery({
        queryKey: ['channels', 'invite', inviteCode],
        queryFn: async () => {
            const response = await channelsApi.getChannelByInviteCode(inviteCode!);
            return response.result;
        },
        enabled: !!inviteCode,
        staleTime: STALE_TIME,
    });
}

export function useJoinByInviteCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (inviteCode: string) => channelsApi.joinByInviteCode(inviteCode),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
        },
    });
}

export function useRegenerateInviteCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (channelId: number) => channelsApi.regenerateInviteCode(channelId),
        onSuccess: (_, channelId) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.channels.detail(channelId),
            });
        },
    });
}

// Re-export types for convenience
export type { ChannelCategory, DiscoverChannelsParams } from '../api';
