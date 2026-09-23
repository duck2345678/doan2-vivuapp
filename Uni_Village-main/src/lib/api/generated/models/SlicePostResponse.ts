/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pageable } from './Pageable';
import type { PostResponse } from './PostResponse';
import type { Sort } from './Sort';
export type SlicePostResponse = {
    content?: Array<PostResponse>;
    pageable?: Pageable;
    size?: number;
    number?: number;
    sort?: Sort;
    numberOfElements?: number;
    first?: boolean;
    last?: boolean;
    empty?: boolean;
};

