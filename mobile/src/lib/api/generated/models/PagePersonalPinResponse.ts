/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pageable } from './Pageable';
import type { PersonalPinResponse } from './PersonalPinResponse';
import type { Sort } from './Sort';
export type PagePersonalPinResponse = {
    content?: Array<PersonalPinResponse>;
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

