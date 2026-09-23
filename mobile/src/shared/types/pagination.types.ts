/**
 * Pagination Types
 * Spring Data Page and Slice types for VNU Guide Backend
 */

/**
 * Sort information from Spring Data
 */
export interface Sort {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
}

/**
 * Pageable information from Spring Data
 */
export interface Pageable {
    pageNumber: number;
    pageSize: number;
    sort: Sort;
    offset: number;
    paged: boolean;
    unpaged: boolean;
}

/**
 * Page response from Spring Data (with total count)
 * Used when backend needs to return total elements count
 */
export interface Page<T> {
    content: T[];
    pageable: Pageable;
    totalPages: number;
    totalElements: number;
    last: boolean;
    size: number;
    number: number;
    sort: Sort;
    numberOfElements: number;
    first: boolean;
    empty: boolean;
}

/**
 * Slice response from Spring Data (without total count)
 * More efficient for infinite scroll scenarios
 */
export interface Slice<T> {
    content: T[];
    pageable: Pageable;
    size: number;
    number: number;
    sort: Sort;
    numberOfElements: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

/**
 * Pagination request params
 */
export interface PaginationParams {
    page?: number;
    size?: number;
    /** @deprecated Use size instead. Kept for backwards compatibility. */
    limit?: number;
}

/**
 * Helper to check if there are more pages
 */
export function hasNextPage<T>(data: Page<T> | Slice<T>): boolean {
    return !data.last;
}

/**
 * Helper to get next page number
 */
export function getNextPageParam<T>(data: Page<T> | Slice<T>): number | undefined {
    return data.last ? undefined : data.number + 1;
}
