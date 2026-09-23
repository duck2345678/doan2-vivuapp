/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pageable } from './Pageable';
import type { PlaceSuggestionResponse } from './PlaceSuggestionResponse';
import type { Sort } from './Sort';
export type PagePlaceSuggestionResponse = {
    content?: Array<PlaceSuggestionResponse>;
    pageable?: Pageable;
    totalPages?: number;
    totalElements?: number;
    last?: boolean;
    size?: number;
    number?: number;
    sort?: Sort;
    numberOfElements?: number;
    first?: boolean;
    empty?: boolean;
};

