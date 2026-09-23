/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SuggestedStop } from './SuggestedStop';
export type SuggestedItinerary = {
    name?: string;
    mood?: string;
    stops?: Array<SuggestedStop>;
    totalDistanceKm?: number;
    totalDurationMinutes?: number;
    routePolyline?: string;
    mapPreviewUrl?: string;
};

