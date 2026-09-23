import { apiClient, createMultipartDataWithSingleFile, type FileUpload } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/shared/types/api.types';
import type {
    AddChannelMemberRequest,
    ChannelMemberResponse,
    ChannelPrivacy,
    ChannelResponse,
    ChannelType,
    JoinConversationResponse,
    ParticipantRole,
} from '@/shared/types/backend.types';

// Channel Category enum (matches backend)
export type ChannelCategory = 'TRAVEL' | 'COURSE' | 'FOOD' | 'PHOTOGRAPHY' | 'READING' | 'OTHER';

export interface CreateChannelFormData {
    name: string;
    description?: string;
    privacy?: ChannelPrivacy;
    channelType?: ChannelType;
    category?: ChannelCategory;
    allowSharing?: boolean;
    participantIds?: number[];
    avatar?: FileUpload;
}

export interface UpdateChannelFormData {
    name?: string;
    description?: string;
    privacy?: ChannelPrivacy;
    category?: ChannelCategory;
    allowSharing?: boolean;
    avatar?: FileUpload;
}

export interface DiscoverChannelsParams {
    search?: string;
    category?: ChannelCategory;
    page?: number;
    size?: number;
}

export const channelsApi = {
    createChannel: (data: CreateChannelFormData): Promise<ApiResponse<ChannelResponse>> => {
        const formData = createMultipartDataWithSingleFile(
            {
                name: data.name,
                description: data.description,
                privacy: data.privacy,
                channelType: data.channelType,
                category: data.category,
                allowSharing: data.allowSharing?.toString(),
                participantIds: data.participantIds ? JSON.stringify(data.participantIds) : undefined,
            },
            data.avatar,
            'avatar'
        );
        return apiClient.postMultipart<ApiResponse<ChannelResponse>>(
            API_ENDPOINTS.CHANNELS.CREATE,
            formData
        );
    },

    getChannel: (channelId: number): Promise<ApiResponse<ChannelResponse>> =>
        apiClient.get<ApiResponse<ChannelResponse>>(
            API_ENDPOINTS.CHANNELS.BY_ID(channelId)
        ),

    getChannelByConversation: (conversationId: string): Promise<ApiResponse<ChannelResponse>> =>
        apiClient.get<ApiResponse<ChannelResponse>>(
            API_ENDPOINTS.CHANNELS.BY_CONVERSATION(conversationId)
        ),

    updateChannel: (
        channelId: number,
        data: UpdateChannelFormData
    ): Promise<ApiResponse<ChannelResponse>> => {
        const formData = createMultipartDataWithSingleFile(
            {
                name: data.name,
                description: data.description,
                privacy: data.privacy,
                category: data.category,
                allowSharing: data.allowSharing?.toString(),
            },
            data.avatar,
            'avatar'
        );
        return apiClient.patchMultipart<ApiResponse<ChannelResponse>>(
            API_ENDPOINTS.CHANNELS.BY_ID(channelId),
            formData
        );
    },

    getChannelMembers: (channelId: number): Promise<ApiResponse<ChannelMemberResponse[]>> =>
        apiClient.get<ApiResponse<ChannelMemberResponse[]>>(
            API_ENDPOINTS.CHANNELS.MEMBERS(channelId)
        ),

    addMembers: (
        channelId: number,
        data: AddChannelMemberRequest
    ): Promise<ApiResponse<ChannelResponse>> =>
        apiClient.post<ApiResponse<ChannelResponse>>(
            API_ENDPOINTS.CHANNELS.MEMBERS(channelId),
            data
        ),

    removeMember: (channelId: number, memberId: number): Promise<ApiResponse<ChannelResponse>> =>
        apiClient.delete<ApiResponse<ChannelResponse>>(
            API_ENDPOINTS.CHANNELS.REMOVE_MEMBER(channelId, memberId)
        ),

    updateMemberRole: (
        channelId: number,
        memberId: number,
        role: ParticipantRole
    ): Promise<ApiResponse<ChannelMemberResponse>> =>
        apiClient.patch<ApiResponse<ChannelMemberResponse>>(
            API_ENDPOINTS.CHANNELS.UPDATE_MEMBER_ROLE(channelId, memberId),
            undefined,
            { params: { role } }
        ),

    getJoinRequests: (channelId: number): Promise<ApiResponse<JoinConversationResponse[]>> =>
        apiClient.get<ApiResponse<JoinConversationResponse[]>>(
            API_ENDPOINTS.CHANNELS.JOIN_REQUESTS(channelId)
        ),

    // ==================== DISCOVERY & INVITE ====================

    discoverPublicChannels: (params: DiscoverChannelsParams = {}): Promise<ApiResponse<ChannelResponse[]>> =>
        apiClient.get<ApiResponse<ChannelResponse[]>>(
            API_ENDPOINTS.CHANNELS.DISCOVER_PUBLIC,
            {
                params: {
                    search: params.search,
                    category: params.category,
                    page: params.page ?? 0,
                    size: params.size ?? 20,
                },
            }
        ),

    getChannelByInviteCode: (inviteCode: string): Promise<ApiResponse<ChannelResponse>> =>
        apiClient.get<ApiResponse<ChannelResponse>>(
            API_ENDPOINTS.CHANNELS.BY_INVITE_CODE(inviteCode)
        ),

    joinByInviteCode: (inviteCode: string): Promise<ApiResponse<ChannelResponse>> =>
        apiClient.post<ApiResponse<ChannelResponse>>(
            API_ENDPOINTS.CHANNELS.JOIN_BY_INVITE(inviteCode)
        ),

    regenerateInviteCode: (channelId: number): Promise<ApiResponse<ChannelResponse>> =>
        apiClient.post<ApiResponse<ChannelResponse>>(
            API_ENDPOINTS.CHANNELS.REGENERATE_INVITE(channelId)
        ),
};
