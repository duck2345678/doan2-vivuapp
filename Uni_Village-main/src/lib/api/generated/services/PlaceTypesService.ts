/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponsePlaceTypeList } from '../models/ApiResponsePlaceTypeList';
import type { ApiResponsePlaceTypeResponse } from '../models/ApiResponsePlaceTypeResponse';
import type { PlaceTypeRequest } from '../models/PlaceTypeRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PlaceTypesService {
    /**
     * List place types
     * @returns ApiResponsePlaceTypeList List of place types
     * @throws ApiError
     */
    public static getApiV1PlaceTypes(): CancelablePromise<ApiResponsePlaceTypeList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/place-types',
        });
    }
    /**
     * Create place type (ADMIN)
     * @param requestBody
     * @returns ApiResponsePlaceTypeResponse Created
     * @throws ApiError
     */
    public static postApiV1AdminPlaceTypes(
        requestBody: PlaceTypeRequest,
    ): CancelablePromise<ApiResponsePlaceTypeResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/place-types',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update place type (ADMIN)
     * @param id
     * @param requestBody
     * @returns ApiResponsePlaceTypeResponse Updated
     * @throws ApiError
     */
    public static patchApiV1AdminPlaceTypes(
        id: number,
        requestBody: PlaceTypeRequest,
    ): CancelablePromise<ApiResponsePlaceTypeResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/place-types/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
