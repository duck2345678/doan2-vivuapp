/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseLikeResponse } from '../models/ApiResponseLikeResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ReactionsService {
    /**
     * Toggle like on post
     * @param postId
     * @returns ApiResponseLikeResponse Liked/unliked
     * @throws ApiError
     */
    public static postApiV1LikesPost(
        postId: number,
    ): CancelablePromise<ApiResponseLikeResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/likes/post/{postId}',
            path: {
                'postId': postId,
            },
        });
    }
    /**
     * Toggle like on comment
     * @param commentId
     * @returns ApiResponseLikeResponse Liked/unliked
     * @throws ApiError
     */
    public static postApiV1LikesComment(
        commentId: number,
    ): CancelablePromise<ApiResponseLikeResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/likes/comment/{commentId}',
            path: {
                'commentId': commentId,
            },
        });
    }
}
