/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlaceResponse } from './PlaceResponse';
export type TourStopResponse = {
    id?: number;
    tourId?: number;
    placeId?: number;
    placeName?: string;
    sequenceOrder?: number;
    note?: string;
    place?: PlaceResponse;
};

