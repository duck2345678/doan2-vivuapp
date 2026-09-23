/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageSearchResponse } from './MessageSearchResponse';
import type { Pageable } from './Pageable';
import type { Sort } from './Sort';
export type SliceMessageSearchResponse = {
    content?: Array<MessageSearchResponse>;
    pageable?: Pageable;
    size?: number;
    number?: number;
    sort?: Sort;
    numberOfElements?: number;
    first?: boolean;
    last?: boolean;
    empty?: boolean;
};

