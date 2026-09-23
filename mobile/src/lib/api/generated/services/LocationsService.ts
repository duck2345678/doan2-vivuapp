/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseDistrictList } from '../models/ApiResponseDistrictList';
import type { ApiResponseProvinceList } from '../models/ApiResponseProvinceList';
import type { ApiResponseWardList } from '../models/ApiResponseWardList';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LocationsService {
    /**
     * List provinces
     * @returns ApiResponseProvinceList Provinces
     * @throws ApiError
     */
    public static getApiV1LocationsProvinces(): CancelablePromise<ApiResponseProvinceList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/locations/provinces',
        });
    }
    /**
     * List districts by province
     * @param provinceId
     * @returns ApiResponseDistrictList Districts
     * @throws ApiError
     */
    public static getApiV1LocationsDistricts(
        provinceId: number,
    ): CancelablePromise<ApiResponseDistrictList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/locations/districts',
            query: {
                'provinceId': provinceId,
            },
        });
    }
    /**
     * List wards by district
     * @param districtId
     * @returns ApiResponseWardList Wards
     * @throws ApiError
     */
    public static getApiV1LocationsWards(
        districtId: number,
    ): CancelablePromise<ApiResponseWardList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/locations/wards',
            query: {
                'districtId': districtId,
            },
        });
    }
}
