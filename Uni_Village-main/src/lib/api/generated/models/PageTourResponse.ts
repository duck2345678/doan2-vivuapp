/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pageable } from './Pageable';
import type { Sort } from './Sort';
import type { TourResponse } from './TourResponse';
export type PageTourResponse = {
    content?: Array<TourResponse>;
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

