/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DistrictResponse } from './DistrictResponse';
import type { PlaceStatus } from './PlaceStatus';
import type { PlaceTypeResponse } from './PlaceTypeResponse';
import type { ProvinceResponse } from './ProvinceResponse';
import type { WardResponse } from './WardResponse';
export type PlaceResponse = {
    id?: number;
    name?: string;
    placeType?: PlaceTypeResponse;
    province?: ProvinceResponse;
    district?: DistrictResponse;
    ward?: WardResponse;
    addressDetail?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    status?: PlaceStatus;
    isOfficial?: boolean;
    ownerUserId?: number;
    createdAt?: string;
    updatedAt?: string;
};

