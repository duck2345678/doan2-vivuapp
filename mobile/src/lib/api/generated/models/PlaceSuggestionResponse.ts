/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DistrictResponse } from './DistrictResponse';
import type { PlaceSuggestionStatus } from './PlaceSuggestionStatus';
import type { PlaceTypeResponse } from './PlaceTypeResponse';
import type { ProvinceResponse } from './ProvinceResponse';
import type { WardResponse } from './WardResponse';
export type PlaceSuggestionResponse = {
    id?: number;
    suggestedById?: number;
    suggestedByName?: string;
    placeName?: string;
    placeType?: PlaceTypeResponse;
    province?: ProvinceResponse;
    district?: DistrictResponse;
    ward?: WardResponse;
    addressDetail?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    status?: PlaceSuggestionStatus;
    rejectionReason?: string;
    reviewedById?: number;
    reviewedAt?: string;
    createdAt?: string;
};

