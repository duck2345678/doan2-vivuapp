/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponsePlaceSuggestionPage } from '../models/ApiResponsePlaceSuggestionPage';
import type { ApiResponsePlaceSuggestionResponse } from '../models/ApiResponsePlaceSuggestionResponse';
import type { PlaceSuggestionRequest } from '../models/PlaceSuggestionRequest';
import type { PlaceSuggestionReviewRequest } from '../models/PlaceSuggestionReviewRequest';
import type { PlaceSuggestionStatus } from '../models/PlaceSuggestionStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PlaceSuggestionsService {
    /**
     * Submit place suggestion
     * @param requestBody
     * @returns ApiResponsePlaceSuggestionResponse Created
     * @throws ApiError
     */
    public static postApiV1PlaceSuggestions(
        requestBody: PlaceSuggestionRequest,
    ): CancelablePromise<ApiResponsePlaceSuggestionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/place-suggestions',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * My place suggestions
     * @param status
     * @param page
     * @param size
     * @returns ApiResponsePlaceSuggestionPage Page of suggestions
     * @throws ApiError
     */
    public static getApiV1MePlaceSuggestions(
        status?: PlaceSuggestionStatus,
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponsePlaceSuggestionPage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/me/place-suggestions',
            query: {
                'status': status,
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * All suggestions (ADMIN)
     * @param status
     * @param page
     * @param size
     * @returns ApiResponsePlaceSuggestionPage Page of suggestions
     * @throws ApiError
     */
    public static getApiV1AdminPlaceSuggestions(
        status?: PlaceSuggestionStatus,
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponsePlaceSuggestionPage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/place-suggestions',
            query: {
                'status': status,
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Review suggestion (ADMIN)
     * @param id
     * @param requestBody
     * @returns ApiResponsePlaceSuggestionResponse Reviewed
     * @throws ApiError
     */
    public static patchApiV1AdminPlaceSuggestionsReview(
        id: number,
        requestBody: PlaceSuggestionReviewRequest,
    ): CancelablePromise<ApiResponsePlaceSuggestionResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/place-suggestions/{id}/review',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
