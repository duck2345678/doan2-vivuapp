/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ItinerarySuggestRequest } from '../models/ItinerarySuggestRequest';
import type { SuggestedItinerary } from '../models/SuggestedItinerary';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AiService {
    /**
     * Suggest AI itinerary
     * @param requestBody
     * @returns SuggestedItinerary Suggested itinerary
     * @throws ApiError
     */
    public static postAiItinerariesSuggest(
        requestBody: ItinerarySuggestRequest,
    ): CancelablePromise<SuggestedItinerary> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ai/itineraries/suggest',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
