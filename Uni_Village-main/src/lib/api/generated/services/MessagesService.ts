/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseFileMessageResponse } from '../models/ApiResponseFileMessageResponse';
import type { ApiResponseMessageResponse } from '../models/ApiResponseMessageResponse';
import type { ApiResponseMessageSearchSlice } from '../models/ApiResponseMessageSearchSlice';
import type { ApiResponseMessageSlice } from '../models/ApiResponseMessageSlice';
import type { ApiResponseString } from '../models/ApiResponseString';
import type { ApiResponseVoid } from '../models/ApiResponseVoid';
import type { MarkReadRequest } from '../models/MarkReadRequest';
import type { MessageRequest } from '../models/MessageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MessagesService {
    /**
     * Send message
     * @param requestBody
     * @returns ApiResponseMessageResponse Sent
     * @throws ApiError
     */
    public static postApiV1MessagesSend(
        requestBody: MessageRequest,
    ): CancelablePromise<ApiResponseMessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/messages/send',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Send message with files
     * @param formData
     * @returns ApiResponseFileMessageResponse Sent
     * @throws ApiError
     */
    public static postApiV1MessagesUploadFile(
        formData: {
            files: Array<Blob>;
            conversationId: string;
            content?: string;
            replyToId?: number;
        },
    ): CancelablePromise<ApiResponseFileMessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/messages/upload-file',
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * Get messages by conversation
     * @param conversationId
     * @param page
     * @param size
     * @returns ApiResponseMessageSlice Slice of messages
     * @throws ApiError
     */
    public static getApiV1Messages(
        conversationId: string,
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponseMessageSlice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/messages',
            query: {
                'conversationId': conversationId,
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Delete message
     * @param messageId
     * @returns ApiResponseString Deleted
     * @throws ApiError
     */
    public static deleteApiV1Messages(
        messageId: number,
    ): CancelablePromise<ApiResponseString> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/messages/{messageId}',
            path: {
                'messageId': messageId,
            },
        });
    }
    /**
     * Edit message
     * @param messageId
     * @param requestBody
     * @returns ApiResponseMessageResponse Edited
     * @throws ApiError
     */
    public static putApiV1Messages(
        messageId: number,
        requestBody: string,
    ): CancelablePromise<ApiResponseMessageResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/messages/{messageId}',
            path: {
                'messageId': messageId,
            },
            body: requestBody,
            mediaType: 'text/plain',
        });
    }
    /**
     * Mark conversation as read
     * @param requestBody
     * @returns ApiResponseVoid Marked read
     * @throws ApiError
     */
    public static postApiV1MessagesMarkRead(
        requestBody: MarkReadRequest,
    ): CancelablePromise<ApiResponseVoid> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/messages/mark-read',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Search messages
     * @param conversationId
     * @param keyword
     * @param page
     * @param size
     * @returns ApiResponseMessageSearchSlice Search results
     * @throws ApiError
     */
    public static getApiV1MessagesSearch(
        conversationId: string,
        keyword: string,
        page?: number,
        size: number = 20,
    ): CancelablePromise<ApiResponseMessageSearchSlice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/messages/search',
            query: {
                'conversationId': conversationId,
                'keyword': keyword,
                'page': page,
                'size': size,
            },
        });
    }
}
