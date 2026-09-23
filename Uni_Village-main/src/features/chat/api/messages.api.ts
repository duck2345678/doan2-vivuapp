import { apiClient, createMultipartData, type FileUpload } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/shared/types/api.types';
import type { Slice } from '@/shared/types/pagination.types';
import type {
    MessageRequest,
    MessageResponse,
    FileMessageResponse,
    MessageSearchResponse,
    MarkReadRequest,
} from '@/shared/types/backend.types';

export interface SendMessageFormData {
    content?: string;
    replyToId?: number;
    conversationId: string;
    files?: FileUpload[];
}

export interface MessageSearchParams {
    conversationId: string;
    keyword: string;
    page?: number;
    size?: number;
}

export interface GetMessagesParams {
    conversationId: string;
    page?: number;
    size?: number;
}

export const messagesApi = {
    sendMessage: (data: MessageRequest): Promise<ApiResponse<MessageResponse>> =>
        apiClient.post<ApiResponse<MessageResponse>>(API_ENDPOINTS.MESSAGES.SEND, {
            content: data.content,
            ConversationId: data.ConversationId,
            ...(data.replyToId !== undefined && { replyToId: data.replyToId }),
        }),

    sendMessageWithFiles: (
        data: SendMessageFormData
    ): Promise<ApiResponse<FileMessageResponse>> => {
        const formData = createMultipartData(
            {
                conversationId: data.conversationId,
                content: data.content,
                replyToId: data.replyToId,
            },
            data.files
        );
        return apiClient.postMultipart<ApiResponse<FileMessageResponse>>(
            API_ENDPOINTS.MESSAGES.UPLOAD_FILE,
            formData
        );
    },

    getMessages: (params: GetMessagesParams): Promise<ApiResponse<Slice<MessageResponse>>> =>
        apiClient.get<ApiResponse<Slice<MessageResponse>>>(API_ENDPOINTS.MESSAGES.LIST, {
            params,
        }),

    updateMessage: (messageId: number, content: string): Promise<ApiResponse<MessageResponse>> =>
        apiClient.put<ApiResponse<MessageResponse>>(
            API_ENDPOINTS.MESSAGES.BY_ID(messageId),
            content,
            {
                headers: {
                    'Content-Type': 'text/plain',
                },
            }
        ),

    deleteMessage: (messageId: number): Promise<ApiResponse<string>> =>
        apiClient.delete<ApiResponse<string>>(API_ENDPOINTS.MESSAGES.BY_ID(messageId)),

    markAsRead: (data: MarkReadRequest): Promise<ApiResponse<void>> =>
        apiClient.post<ApiResponse<void>>(API_ENDPOINTS.MESSAGES.MARK_READ, data),

    searchMessages: (
        params: MessageSearchParams
    ): Promise<ApiResponse<Slice<MessageSearchResponse>>> =>
        apiClient.get<ApiResponse<Slice<MessageSearchResponse>>>(
            API_ENDPOINTS.MESSAGES.SEARCH,
            { params }
        ),
};
