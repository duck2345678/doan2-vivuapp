import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/shared/types/api.types';
import type {
    ConversationPrivateRequest,
    ConversationResponse,
    FileType,
    JoinConversationResponse,
    MediaAttachmentResponse,
} from '@/shared/types/backend.types';
import type { Slice } from '@/shared/types/pagination.types';
import type { RelationshipStatus } from './friends.api';

export interface ConversationSearchParams {
    page?: number;
    size?: number;
}

export type ParticipantStatus = 'INBOX' | 'REQUEST' | 'ARCHIVED' | 'DELETED';

export interface DirectConversationResponse {
    conversationId: string;
    isNew: boolean;
    areFriends: boolean;
    relationshipStatus: RelationshipStatus;
    participantStatus: ParticipantStatus;
    otherUserId: number;
    otherUserDisplayName: string;
    otherUserAvatarUrl?: string;
}

export const conversationsApi = {
    createPrivateConversation: (
        data: ConversationPrivateRequest
    ): Promise<ApiResponse<string>> =>
        apiClient.post<ApiResponse<string>>(
            API_ENDPOINTS.CONVERSATIONS.CREATE_PRIVATE,
            data
        ),

    getOrCreateDirect: (targetUserId: number): Promise<ApiResponse<DirectConversationResponse>> =>
        apiClient.get<ApiResponse<DirectConversationResponse>>(
            API_ENDPOINTS.CONVERSATIONS.DIRECT(targetUserId)
        ),

    getPrivateConversations: (
        params: ConversationSearchParams
    ): Promise<ApiResponse<Slice<ConversationResponse>>> =>
        apiClient.get<ApiResponse<Slice<ConversationResponse>>>(
            API_ENDPOINTS.CONVERSATIONS.PRIVATE_LIST,
            { params }
        ),

    getChannelConversations: (
        params: ConversationSearchParams
    ): Promise<ApiResponse<Slice<ConversationResponse>>> =>
        apiClient.get<ApiResponse<Slice<ConversationResponse>>>(
            API_ENDPOINTS.CONVERSATIONS.CHANNELS_LIST,
            { params }
        ),

    deleteConversation: (conversationId: string): Promise<ApiResponse<string>> =>
        apiClient.delete<ApiResponse<string>>(
            API_ENDPOINTS.CONVERSATIONS.DELETE(conversationId)
        ),

    getConversationMedia: (
        conversationId: string,
        fileType?: FileType
    ): Promise<ApiResponse<MediaAttachmentResponse[]>> =>
        apiClient.get<ApiResponse<MediaAttachmentResponse[]>>(
            API_ENDPOINTS.CONVERSATIONS.MEDIA(conversationId),
            { params: { fileType } }
        ),

    joinConversation: (conversationId: string): Promise<ApiResponse<JoinConversationResponse>> =>
        apiClient.post<ApiResponse<JoinConversationResponse>>(
            API_ENDPOINTS.CONVERSATIONS.JOIN(conversationId)
        ),

    acceptJoinRequest: (joinRequestId: number): Promise<ApiResponse<any>> =>
        apiClient.post<ApiResponse<any>>(
            API_ENDPOINTS.CONVERSATIONS.ACCEPT_JOIN(joinRequestId)
        ),

    rejectJoinRequest: (joinRequestId: number): Promise<ApiResponse<any>> =>
        apiClient.patch<ApiResponse<any>>(
            API_ENDPOINTS.CONVERSATIONS.REJECT_JOIN(joinRequestId)
        ),
};
