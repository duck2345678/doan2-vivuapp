/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommentResponse } from './CommentResponse';
import type { Pageable } from './Pageable';
import type { Sort } from './Sort';
export type SliceCommentResponse = {
    content?: Array<CommentResponse>;
    pageable?: Pageable;
    size?: number;
    number?: number;
    sort?: Sort;
    numberOfElements?: number;
    first?: boolean;
    last?: boolean;
    empty?: boolean;
};

