/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseTourStopList } from '../models/ApiResponseTourStopList';
import type { ApiResponseTourStopResponse } from '../models/ApiResponseTourStopResponse';
import type { TourStopReorderRequest } from '../models/TourStopReorderRequest';
import type { TourStopRequest } from '../models/TourStopRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TourStopsService {
    /**
     * Get tour stops
     * @param id
     * @returns ApiResponseTourStopList Stops
     * @throws ApiError
     */
    public static getApiV1ToursStops(
        id: number,
    ): CancelablePromise<ApiResponseTourStopList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tours/{id}/stops',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Add tour stop
     * @param id
     * @param requestBody
     * @returns ApiResponseTourStopResponse Added
     * @throws ApiError
     */
    public static postApiV1MeToursStops(
        id: number,
        requestBody: TourStopRequest,
    ): CancelablePromise<ApiResponseTourStopResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/me/tours/{id}/stops',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Reorder tour stops
     * @param id
     * @param requestBody
     * @returns ApiResponseTourStopList Reordered
     * @throws ApiError
     */
    public static putApiV1MeToursStopsReorder(
        id: number,
        requestBody: TourStopReorderRequest,
    ): CancelablePromise<ApiResponseTourStopList> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/me/tours/{id}/stops/reorder',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Remove tour stop
     * @param id
     * @param stopId
     * @returns void
     * @throws ApiError
     */
    public static deleteApiV1MeToursStops(
        id: number,
        stopId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/me/tours/{id}/stops/{stopId}',
            path: {
                'id': id,
                'stopId': stopId,
            },
        });
    }
}
