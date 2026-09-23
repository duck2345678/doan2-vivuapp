/**
 * Shared Types Barrel Export
 */

// VNU Guide Backend types (primary)
export {
    ApiResponse,
    ErrorResponse, FilterCondition, FilterOperator, HttpMethod, MutationResult, QueryOptions, RequestOptions,
    SortDirection,
    SortOptions, UnwrapApiResponse, ValidationErrorResponse,
    ValidationFieldError
} from './api.types';

export {
    getNextPageParam, hasNextPage, Page, Pageable, PaginationParams, Slice, Sort
} from './pagination.types';

export * from './channel';
export * from './enums.types';
export * from './report.types';

// Legacy common types (excluding conflicting names)
export {
    ApiErrorResponse,
    AsyncState, AsyncVoidFunction, BaseEntity, ID, Nullable,
    Optional, PaginatedResponse, StringRecord,
    VoidFunction
} from './common.types';

