/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponsePlaceList } from '../models/ApiResponsePlaceList';
import type { ApiResponsePlacePage } from '../models/ApiResponsePlacePage';
import type { ApiResponsePlaceResponse } from '../models/ApiResponsePlaceResponse';
import type { PlaceRequest } from '../models/PlaceRequest';
import type { PlaceStatus } from '../models/PlaceStatus';
import type { PlaceStatusRequest } from '../models/PlaceStatusRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PlacesService {
    /**
     * Search places
     * @param keyword
     * @param typeId
     * @param provinceId
     * @param districtId
     * @param wardId
     * @param status
     * @param lat
     * @param lng
     * @param radius
     * @param page
     * @param size
     * @returns ApiResponsePlacePage Page of places
     * @throws ApiError
     */
    public static getApiV1Places(
        keyword?: string,
        typeId?: number,
        provinceId?: number,
        districtId?: number,
        wardId?: number,
        status?: PlaceStatus,
        lat?: number,
        lng?: number,
        radius?: number,
        page?: number,
        size: number = 10,
    ): CancelablePromise<ApiResponsePlacePage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/places',
            query: {
                'keyword': keyword,
                'typeId': typeId,
                'provinceId': provinceId,
                'districtId': districtId,
                'wardId': wardId,
                'status': status,
                'lat': lat,
                'lng': lng,
                'radius': radius,
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * Nearby places
     * @param lat
     * @param lng
     * @param radius
     * @param keyword
     * @param typeId
     * @param status
     * @returns ApiResponsePlaceList Nearby places
     * @throws ApiError
     */
    public static getApiV1PlacesNearby(
        lat: number,
        lng: number,
        radius: number = 5,
        keyword?: string,
        typeId?: number,
        status?: PlaceStatus,
    ): CancelablePromise<ApiResponsePlaceList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/places/nearby',
            query: {
                'lat': lat,
                'lng': lng,
                'radius': radius,
                'keyword': keyword,
                'typeId': typeId,
                'status': status,
            },
        });
    }
    /**
     * Place details
     * @param id
     * @returns ApiResponsePlaceResponse Place
     * @throws ApiError
     */
    public static getApiV1Places1(
        id: number,
    ): CancelablePromise<ApiResponsePlaceResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/places/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Create place (ADMIN)
     * @param requestBody
     * @returns ApiResponsePlaceResponse Created
     * @throws ApiError
     */
    public static postApiV1AdminPlaces(
        requestBody: PlaceRequest,
    ): CancelablePromise<ApiResponsePlaceResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/places',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update place (ADMIN)
     * @param id
     * @param requestBody
     * @returns ApiResponsePlaceResponse Updated
     * @throws ApiError
     */
    public static patchApiV1AdminPlaces(
        id: number,
        requestBody: PlaceRequest,
    ): CancelablePromise<ApiResponsePlaceResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/places/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update place status (ADMIN)
     * @param id
     * @param requestBody
     * @returns ApiResponsePlaceResponse Updated
     * @throws ApiError
     */
    public static patchApiV1AdminPlacesStatus(
        id: number,
        requestBody: PlaceStatusRequest,
    ): CancelablePromise<ApiResponsePlaceResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/places/{id}/status',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
