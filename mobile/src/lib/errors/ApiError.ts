/**
 * Custom API Error Class
 * Standardized error handling for API responses
 */

import { AxiosError } from 'axios';
import type { ErrorResponse, ValidationErrorResponse } from '@/shared/types/api.types';

export interface ApiErrorData {
    message: string;
    code?: string;
    status: number;
    details?: Record<string, unknown>;
    validationErrors?: { field: string; message: string }[];
}

export class ApiError extends Error {
    public readonly status: number;
    public readonly code?: string;
    public readonly details?: Record<string, unknown>;
    public readonly validationErrors?: { field: string; message: string }[];

    constructor({ message, status, code, details, validationErrors }: ApiErrorData) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.validationErrors = validationErrors;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }

    /**
     * Create ApiError from Axios error
     */
    static fromAxiosError(error: AxiosError): ApiError {
        const status = error.response?.status || 500;
        const data = error.response?.data as Record<string, unknown> | undefined;

        if (status === 400 && data?.errors && Array.isArray(data.errors)) {
            const validationData = data as unknown as ValidationErrorResponse;
            return new ApiError({
                message: validationData.error || 'Validation failed',
                status,
                code: 'VALIDATION_ERROR',
                details: data,
                validationErrors: validationData.errors,
            });
        }

        const errorData = data as ErrorResponse | undefined;
        return new ApiError({
            message: errorData?.message || (data?.message as string) || error.message || 'An unexpected error occurred',
            status,
            code: errorData?.errorCode || (data?.code as string) || error.code,
            details: data,
        });
    }

    /**
     * Check if error is a specific status code
     */
    isStatus(status: number): boolean {
        return this.status === status;
    }

    /**
     * Check if error is unauthorized (401)
     */
    isUnauthorized(): boolean {
        return this.status === 401;
    }

    /**
     * Check if error is forbidden (403)
     */
    isForbidden(): boolean {
        return this.status === 403;
    }

    /**
     * Check if error is not found (404)
     */
    isNotFound(): boolean {
        return this.status === 404;
    }

    /**
     * Check if error is validation error (400 or 422)
     */
    isValidationError(): boolean {
        return this.status === 400 || this.status === 422;
    }

    /**
     * Check if error is bad request (400)
     */
    isBadRequest(): boolean {
        return this.status === 400;
    }

    /**
     * Check if error is server error (5xx)
     */
    isServerError(): boolean {
        return this.status >= 500;
    }

    /**
     * Get user-friendly error message
     */
    getUserMessage(): string {
        if (this.validationErrors && this.validationErrors.length > 0) {
            return this.validationErrors.map(e => `${e.field}: ${e.message}`).join(', ');
        }

        switch (this.status) {
            case 400:
                return this.message || 'Invalid request. Please check your input.';
            case 401:
                return 'You need to login to continue.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'The requested resource was not found.';
            case 500:
                return 'Server error. Please try again later.';
            default:
                return this.message || 'An unexpected error occurred.';
        }
    }

    /**
     * Convert to JSON for logging
     */
    toJSON(): ApiErrorData {
        return {
            message: this.message,
            status: this.status,
            code: this.code,
            details: this.details,
            validationErrors: this.validationErrors,
        };
    }
}
