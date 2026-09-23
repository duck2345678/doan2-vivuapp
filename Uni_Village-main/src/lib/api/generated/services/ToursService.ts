/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseTourPage } from '../models/ApiResponseTourPage';
import type { ApiResponseTourResponse } from '../models/ApiResponseTourResponse';
import type { TourRequest } from '../models/TourRequest';
import type { TourShareRequest } from '../models/TourShareRequest';
import type { TourStatus } from '../models/TourStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ToursService {
    /**
     * List my tours
     * @param status
     * @param page
     * @param size
     * @returns ApiResponseTourPage Page of tours
     * @throws ApiError
     */
    public static getApiV1MeTours(
        status?: TourStatus,
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponseTourPage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/me/tours',
            query: {
                'status': status,
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Create tour
     * @param requestBody
     * @returns ApiResponseTourResponse Created
     * @throws ApiError
     */
    public static postApiV1MeTours(
        requestBody: TourRequest,
    ): CancelablePromise<ApiResponseTourResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/me/tours',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get current tour
     * @returns ApiResponseTourResponse Current tour (result can be null)
     * @throws ApiError
     */
    public static getApiV1MeToursCurrent(): CancelablePromise<ApiResponseTourResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/me/tours/current',
        });
    }
    /**
     * Get tour by id (public)
     * @param id
     * @returns ApiResponseTourResponse Tour
     * @throws ApiError
     */
    public static getApiV1Tours(
        id: number,
    ): CancelablePromise<ApiResponseTourResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tours/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Update tour
     * @param id
     * @param requestBody
     * @returns ApiResponseTourResponse Updated
     * @throws ApiError
     */
    public static patchApiV1MeTours(
        id: number,
        requestBody: TourRequest,
    ): CancelablePromise<ApiResponseTourResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/me/tours/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Complete tour
     * @param id
     * @returns ApiResponseTourResponse Completed
     * @throws ApiError
     */
    public static postApiV1MeToursComplete(
        id: number,
    ): CancelablePromise<ApiResponseTourResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/me/tours/{id}/complete',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Cancel tour
     * @param id
     * @returns ApiResponseTourResponse Cancelled
     * @throws ApiError
     */
    public static postApiV1MeToursCancel(
        id: number,
    ): CancelablePromise<ApiResponseTourResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/me/tours/{id}/cancel',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Share tour as post
     * @param id
     * @param requestBody
     * @returns ApiResponseTourResponse Shared
     * @throws ApiError
     */
    public static postApiV1MeToursShareAsPost(
        id: number,
        requestBody: TourShareRequest,
    ): CancelablePromise<ApiResponseTourResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/me/tours/{id}/share-as-post',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Copy tour
     * @param id
     * @returns ApiResponseTourResponse Copied
     * @throws ApiError
     */
    public static postApiV1ToursCopy(
        id: number,
    ): CancelablePromise<ApiResponseTourResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tours/{id}/copy',
            path: {
                'id': id,
            },
        });
    }
}
