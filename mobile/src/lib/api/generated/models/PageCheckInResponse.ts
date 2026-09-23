/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckInResponse } from './CheckInResponse';
import type { Pageable } from './Pageable';
import type { Sort } from './Sort';
export type PageCheckInResponse = {
    content?: Array<CheckInResponse>;
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

