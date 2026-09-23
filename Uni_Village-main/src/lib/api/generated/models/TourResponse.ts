/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TourStatus } from './TourStatus';
import type { TourStopResponse } from './TourStopResponse';
export type TourResponse = {
    id?: number;
    userId?: number;
    userName?: string;
    name?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    status?: TourStatus;
    sharedAsPost?: boolean;
    originalTourId?: number;
    stops?: Array<TourStopResponse>;
    staticMapUrl?: string;
    createdAt?: string;
    updatedAt?: string;
};

