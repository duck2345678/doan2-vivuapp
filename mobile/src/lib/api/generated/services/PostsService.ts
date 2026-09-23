/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCommentSlice } from '../models/ApiResponseCommentSlice';
import type { ApiResponsePostResponse } from '../models/ApiResponsePostResponse';
import type { ApiResponsePostSlice } from '../models/ApiResponsePostSlice';
import type { ApiResponseSavedPostResponse } from '../models/ApiResponseSavedPostResponse';
import type { ApiResponseSharePostResponse } from '../models/ApiResponseSharePostResponse';
import type { SharePostRequest } from '../models/SharePostRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PostsService {
    /**
     * Create post with files
     * @param formData
     * @returns ApiResponsePostResponse Created
     * @throws ApiError
     */
    public static postApiV1PostsCreate(
        formData: {
            content?: string;
            postType: 'EXPERIENCE' | 'ITINERARY' | 'GROUP_INVITE' | 'TOUR' | 'TOUR_SHARE';
            visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
            tourId?: string;
            files?: Array<Blob>;
        },
    ): CancelablePromise<ApiResponsePostResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/posts/create',
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * Get post by id
     * @param postId
     * @returns ApiResponsePostResponse Post
     * @throws ApiError
     */
    public static getApiV1Posts(
        postId: number,
    ): CancelablePromise<ApiResponsePostResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/posts/{postId}',
            path: {
                'postId': postId,
            },
        });
    }
    /**
     * Get comments by post
     * @param postId
     * @param page
     * @param size
     * @returns ApiResponseCommentSlice Slice of comments
     * @throws ApiError
     */
    public static getApiV1PostsComments(
        postId: number,
        page?: number,
        size: number = 20,
    ): CancelablePromise<ApiResponseCommentSlice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/posts/{postId}/comments',
            path: {
                'postId': postId,
            },
            query: {
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Get feed
     * @param page
     * @param size
     * @returns ApiResponsePostSlice Feed
     * @throws ApiError
     */
    public static getApiV1Posts1(
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponsePostSlice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/posts',
            query: {
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Get my posts
     * @param page
     * @param size
     * @returns ApiResponsePostSlice My posts
     * @throws ApiError
     */
    public static getApiV1PostsMe(
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponsePostSlice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/posts/me',
            query: {
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Toggle save post
     * @param postId
     * @returns ApiResponseSavedPostResponse Saved/unsaved
     * @throws ApiError
     */
    public static postApiV1PostsSave(
        postId: number,
    ): CancelablePromise<ApiResponseSavedPostResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/posts/{postId}/save',
            path: {
                'postId': postId,
            },
        });
    }
    /**
     * Share post
     * @param postId
     * @param requestBody
     * @returns ApiResponseSharePostResponse Shared
     * @throws ApiError
     */
    public static postApiV1PostsShare(
        postId: number,
        requestBody: SharePostRequest,
    ): CancelablePromise<ApiResponseSharePostResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/posts/{postId}/share',
            path: {
                'postId': postId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get saved posts
     * @param page
     * @param size
     * @returns ApiResponsePostSlice Saved posts
     * @throws ApiError
     */
    public static getApiV1PostsMeSavedPosts(
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponsePostSlice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/posts/me/saved-posts',
            query: {
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Delete post
     * @param postId
     * @returns void
     * @throws ApiError
     */
    public static deleteApiV1Posts(
        postId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/posts/{post_id}',
            path: {
                'post_id': postId,
            },
        });
    }
    /**
     * Update post with files
     * @param postId
     * @param formData
     * @returns ApiResponsePostResponse Updated
     * @throws ApiError
     */
    public static putApiV1Posts(
        postId: number,
        formData: {
            content?: string;
            postType: 'EXPERIENCE' | 'ITINERARY' | 'GROUP_INVITE' | 'TOUR' | 'TOUR_SHARE';
            visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
            tourId?: string;
            files?: Array<Blob>;
        },
    ): CancelablePromise<ApiResponsePostResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/posts/{post_id}',
            path: {
                'post_id': postId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
}
