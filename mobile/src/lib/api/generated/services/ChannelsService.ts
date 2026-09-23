/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddChannelMemberRequest } from '../models/AddChannelMemberRequest';
import type { ApiResponseChannelMemberList } from '../models/ApiResponseChannelMemberList';
import type { ApiResponseChannelResponse } from '../models/ApiResponseChannelResponse';
import type { ApiResponseJoinRequestList } from '../models/ApiResponseJoinRequestList';
import type { ChannelPrivacy } from '../models/ChannelPrivacy';
import type { ChannelType } from '../models/ChannelType';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChannelsService {
    /**
     * Create channel
     * @param formData
     * @returns ApiResponseChannelResponse Created
     * @throws ApiError
     */
    public static postApiV1Channels(
        formData: {
            name: string;
            description?: string;
            privacy?: ChannelPrivacy;
            channelType?: ChannelType;
            /**
             * JSON array string, e.g. [1,2,3]
             */
            participantIds?: string;
            avatar?: Blob;
        },
    ): CancelablePromise<ApiResponseChannelResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/channels',
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * Get channel by id
     * @param channelId
     * @returns ApiResponseChannelResponse Channel
     * @throws ApiError
     */
    public static getApiV1Channels(
        channelId: number,
    ): CancelablePromise<ApiResponseChannelResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/channels/{channelId}',
            path: {
                'channelId': channelId,
            },
        });
    }
    /**
     * Update channel (ADMIN)
     * @param channelId
     * @param formData
     * @returns ApiResponseChannelResponse Updated
     * @throws ApiError
     */
    public static patchApiV1Channels(
        channelId: number,
        formData: {
            name?: string;
            description?: string;
            avatar?: Blob;
        },
    ): CancelablePromise<ApiResponseChannelResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/channels/{channelId}',
            path: {
                'channelId': channelId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * Get channel by conversation id
     * @param conversationId
     * @returns ApiResponseChannelResponse Channel
     * @throws ApiError
     */
    public static getApiV1ChannelsConversation(
        conversationId: string,
    ): CancelablePromise<ApiResponseChannelResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/channels/conversation/{conversationId}',
            path: {
                'conversationId': conversationId,
            },
        });
    }
    /**
     * Get channel members
     * @param channelId
     * @returns ApiResponseChannelMemberList Members
     * @throws ApiError
     */
    public static getApiV1ChannelsMembers(
        channelId: number,
    ): CancelablePromise<ApiResponseChannelMemberList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/channels/{channelId}/members',
            path: {
                'channelId': channelId,
            },
        });
    }
    /**
     * Add members (ADMIN)
     * @param channelId
     * @param requestBody
     * @returns ApiResponseChannelResponse Members added
     * @throws ApiError
     */
    public static postApiV1ChannelsMembers(
        channelId: number,
        requestBody: AddChannelMemberRequest,
    ): CancelablePromise<ApiResponseChannelResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/channels/{channelId}/members',
            path: {
                'channelId': channelId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Remove member (ADMIN)
     * @param channelId
     * @param memberId
     * @returns ApiResponseChannelResponse Removed
     * @throws ApiError
     */
    public static deleteApiV1ChannelsMembers(
        channelId: number,
        memberId: number,
    ): CancelablePromise<ApiResponseChannelResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/channels/{channelId}/members/{memberId}',
            path: {
                'channelId': channelId,
                'memberId': memberId,
            },
        });
    }
    /**
     * Join requests (ADMIN)
     * @param channelId
     * @returns ApiResponseJoinRequestList Join requests
     * @throws ApiError
     */
    public static getApiV1ChannelsJoinRequests(
        channelId: number,
    ): CancelablePromise<ApiResponseJoinRequestList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/channels/{channelId}/join-requests',
            path: {
                'channelId': channelId,
            },
        });
    }
}
