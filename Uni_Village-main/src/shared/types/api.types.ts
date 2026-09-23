/**
 * API Types
 * Types for API requests and responses
 */

import type { PaginationParams } from './common.types';

/**
 * HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request options
 */
export interface RequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    timeout?: number;
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort options
 */
export interface SortOptions {
    field: string;
    direction: SortDirection;
}

/**
 * Filter operator
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';

/**
 * Filter condition
 */
export interface FilterCondition {
    field: string;
    operator: FilterOperator;
    value: unknown;
}

/**
 * Query options combining pagination, sort, and filter
 */
export interface QueryOptions extends PaginationParams {
    sort?: SortOptions;
    filters?: FilterCondition[];
    search?: string;
}

/**
 * Mutation result
 */
export interface MutationResult<T> {
    data?: T;
    error?: string;
    success: boolean;
}

// ============================================
// VNU Guide Backend Response Types
// ============================================

/**
 * Standard success response wrapper from VNU Guide Backend
 */
export interface ApiResponse<T> {
    code: number;
    message: string;
    result: T;
}

/**
 * Error response from backend
 */
export interface ErrorResponse {
    status: number;
    errorCode: string;
    error: string;
    message: string;
    path: string;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse {
    status: number;
    error: string;
    path: string;
    errors: ValidationFieldError[];
}

export interface ValidationFieldError {
    field: string;
    message: string;
}

/**
 * Helper type to unwrap API response
 */
export type UnwrapApiResponse<T> = T extends ApiResponse<infer U> ? U : never;
