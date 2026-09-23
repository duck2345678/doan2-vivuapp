/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseAreaList } from '../models/ApiResponseAreaList';
import type { ApiResponseAreaResponse } from '../models/ApiResponseAreaResponse';
import type { AreaRequest } from '../models/AreaRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AreasService {
    /**
     * List areas
     * @returns ApiResponseAreaList List of areas
     * @throws ApiError
     */
    public static getApiV1Areas(): CancelablePromise<ApiResponseAreaList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/areas',
        });
    }
    /**
     * Create area (ADMIN)
     * @param requestBody
     * @returns ApiResponseAreaResponse Created
     * @throws ApiError
     */
    public static postApiV1AdminAreas(
        requestBody: AreaRequest,
    ): CancelablePromise<ApiResponseAreaResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/areas',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update area (ADMIN)
     * @param id
     * @param requestBody
     * @returns ApiResponseAreaResponse Updated
     * @throws ApiError
     */
    public static patchApiV1AdminAreas(
        id: number,
        requestBody: AreaRequest,
    ): CancelablePromise<ApiResponseAreaResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/areas/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
