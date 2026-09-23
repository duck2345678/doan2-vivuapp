/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponsePersonalPinPage } from '../models/ApiResponsePersonalPinPage';
import type { ApiResponsePersonalPinResponse } from '../models/ApiResponsePersonalPinResponse';
import type { PersonalPinRequest } from '../models/PersonalPinRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PersonalPinsService {
    /**
     * Get my personal pins
     * @param page
     * @param size
     * @returns ApiResponsePersonalPinPage Page of personal pins
     * @throws ApiError
     */
    public static getApiV1MePersonalPins(
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponsePersonalPinPage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/me/personal-pins',
            query: {
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Create personal pin
     * @param requestBody
     * @returns ApiResponsePersonalPinResponse Created
     * @throws ApiError
     */
    public static postApiV1MePersonalPins(
        requestBody: PersonalPinRequest,
    ): CancelablePromise<ApiResponsePersonalPinResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/me/personal-pins',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update personal pin
     * @param id
     * @param requestBody
     * @returns ApiResponsePersonalPinResponse Updated
     * @throws ApiError
     */
    public static patchApiV1MePersonalPins(
        id: number,
        requestBody: PersonalPinRequest,
    ): CancelablePromise<ApiResponsePersonalPinResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/me/personal-pins/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete personal pin
     * @param id
     * @returns void
     * @throws ApiError
     */
    public static deleteApiV1MePersonalPins(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/me/personal-pins/{id}',
            path: {
                'id': id,
            },
        });
    }
}
