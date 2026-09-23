/**
 * Shared Types
 * Common TypeScript types used across the application
 */

/**
 * Base entity with id and timestamps
 */
export interface BaseEntity {
    id: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
    page: number;
    limit: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
    message: string;
    code?: string;
    details?: Record<string, string[]>;
}

/**
 * Async state for data fetching
 */
export interface AsyncState<T> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null;

/**
 * Optional type helper
 */
export type Optional<T> = T | undefined;

/**
 * Record with string keys
 */
export type StringRecord<T = unknown> = Record<string, T>;

/**
 * Function type helpers
 */
export type VoidFunction = () => void;
export type AsyncVoidFunction = () => Promise<void>;

/**
 * ID type
 */
export type ID = string | number;
