/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseConversationSlice } from '../models/ApiResponseConversationSlice';
import type { ApiResponseMediaAttachmentList } from '../models/ApiResponseMediaAttachmentList';
import type { ApiResponseString } from '../models/ApiResponseString';
import type { ConversationPrivateRequest } from '../models/ConversationPrivateRequest';
import type { FileType } from '../models/FileType';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ConversationsService {
    /**
     * Create private conversation
     * @param requestBody
     * @returns ApiResponseString Conversation id
     * @throws ApiError
     */
    public static postApiV1ConversationsCreate(
        requestBody: ConversationPrivateRequest,
    ): CancelablePromise<ApiResponseString> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/conversations/create',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List private conversations
     * @param page
     * @param size
     * @returns ApiResponseConversationSlice Slice of conversations
     * @throws ApiError
     */
    public static getApiV1ConversationsPrivate(
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponseConversationSlice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/conversations/private',
            query: {
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * List channel conversations
     * @param page
     * @param size
     * @returns ApiResponseConversationSlice Slice of conversations
     * @throws ApiError
     */
    public static getApiV1ConversationsChannels(
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponseConversationSlice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/conversations/channels',
            query: {
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Leave or delete conversation
     * @param conversationId
     * @returns ApiResponseString Deleted
     * @throws ApiError
     */
    public static deleteApiV1ConversationsDeleteConversation(
        conversationId: string,
    ): CancelablePromise<ApiResponseString> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/conversations/delete-conversation/{conversationId}',
            path: {
                'conversationId': conversationId,
            },
        });
    }
    /**
     * Get conversation media
     * @param conversationId
     * @param fileType
     * @returns ApiResponseMediaAttachmentList Media attachments
     * @throws ApiError
     */
    public static getApiV1ConversationsMedia(
        conversationId: string,
        fileType?: FileType,
    ): CancelablePromise<ApiResponseMediaAttachmentList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/conversations/{conversationId}/media',
            path: {
                'conversationId': conversationId,
            },
            query: {
                'fileType': fileType,
            },
        });
    }
}
