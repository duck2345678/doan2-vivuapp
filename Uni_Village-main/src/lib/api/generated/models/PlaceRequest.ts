/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlaceStatus } from './PlaceStatus';
export type PlaceRequest = {
    name: string;
    typeId: number;
    areaId?: number;
    provinceId?: number;
    districtId?: number;
    wardId?: number;
    addressDetail?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    status?: PlaceStatus;
    isOfficial?: boolean;
    ownerUserId?: number;
};

