/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCommentResponse } from '../models/ApiResponseCommentResponse';
import type { ApiResponseCommentSlice } from '../models/ApiResponseCommentSlice';
import type { CommentRequest } from '../models/CommentRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CommentsService {
    /**
     * Create comment
     * @param requestBody
     * @returns ApiResponseCommentResponse Created
     * @throws ApiError
     */
    public static postApiV1Comments(
        requestBody: CommentRequest,
    ): CancelablePromise<ApiResponseCommentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/comments',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update comment
     * @param commentId
     * @param requestBody
     * @returns ApiResponseCommentResponse Updated
     * @throws ApiError
     */
    public static putApiV1Comments(
        commentId: number,
        requestBody: CommentRequest,
    ): CancelablePromise<ApiResponseCommentResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/comments/{commentId}',
            path: {
                'commentId': commentId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete comment
     * @param commentId
     * @returns void
     * @throws ApiError
     */
    public static deleteApiV1Comments(
        commentId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/comments/{commentId}',
            path: {
                'commentId': commentId,
            },
        });
    }
    /**
     * Get replies
     * @param commentId
     * @param page
     * @param size
     * @returns ApiResponseCommentSlice Replies
     * @throws ApiError
     */
    public static getApiV1CommentsReplies(
        commentId: number,
        page?: number,
        size: number = 20,
    ): CancelablePromise<ApiResponseCommentSlice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/comments/{commentId}/replies',
            path: {
                'commentId': commentId,
            },
            query: {
                'page': page,
                'size': size,
            },
        });
    }
}
