/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCheckInPage } from '../models/ApiResponseCheckInPage';
import type { ApiResponseCheckInResponse } from '../models/ApiResponseCheckInResponse';
import type { CheckInRequest } from '../models/CheckInRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CheckInsService {
    /**
     * Check in
     * @param requestBody
     * @returns ApiResponseCheckInResponse Created
     * @throws ApiError
     */
    public static postApiV1CheckIns(
        requestBody: CheckInRequest,
    ): CancelablePromise<ApiResponseCheckInResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/check-ins',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * My check-ins
     * @param placeId
     * @param tourId
     * @param from
     * @param to
     * @param page
     * @param size
     * @returns ApiResponseCheckInPage Page of check-ins
     * @throws ApiError
     */
    public static getApiV1MeCheckIns(
        placeId?: number,
        tourId?: number,
        from?: string,
        to?: string,
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponseCheckInPage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/me/check-ins',
            query: {
                'placeId': placeId,
                'tourId': tourId,
                'from': from,
                'to': to,
                'page': page,
                'size': size,
            },
        });
    }
}
