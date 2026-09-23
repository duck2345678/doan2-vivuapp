/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseJoinConversationResponse } from '../models/ApiResponseJoinConversationResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class JoinConversationService {
    /**
     * Send join request
     * @param conversationId
     * @returns ApiResponseJoinConversationResponse Request created
     * @throws ApiError
     */
    public static postApiV1ConversationsJoin(
        conversationId: string,
    ): CancelablePromise<ApiResponseJoinConversationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/conversations/join/{conversationId}',
            path: {
                'conversationId': conversationId,
            },
        });
    }
    /**
     * Accept join request (ADMIN)
     * @param joinRequestId
     * @returns ApiResponseJoinConversationResponse Accepted
     * @throws ApiError
     */
    public static postApiV1ConversationsJoinAccept(
        joinRequestId: number,
    ): CancelablePromise<ApiResponseJoinConversationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/conversations/join/accept/{joinRequestId}',
            path: {
                'joinRequestId': joinRequestId,
            },
        });
    }
    /**
     * Reject join request (ADMIN)
     * @param joinRequestId
     * @returns ApiResponseJoinConversationResponse Rejected
     * @throws ApiError
     */
    public static patchApiV1ConversationsJoinReject(
        joinRequestId: number,
    ): CancelablePromise<ApiResponseJoinConversationResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/conversations/join/reject/{joinRequestId}',
            path: {
                'joinRequestId': joinRequestId,
            },
        });
    }
}
