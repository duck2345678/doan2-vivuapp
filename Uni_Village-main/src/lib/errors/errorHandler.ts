/**
 * Global Error Handler
 * Centralized error handling and reporting
 */

import { logger } from '@/lib/monitoring/logger';
import { ApiError } from './ApiError';
import { ValidationError } from './ValidationError';

export type ErrorType = 'api' | 'validation' | 'network' | 'unknown';

export interface HandledError {
    type: ErrorType;
    message: string;
    originalError: Error;
    shouldReport: boolean;
}

/**
 * Determine error type and create standardized error response
 */
export function handleError(error: unknown): HandledError {
    // API Error
    if (error instanceof ApiError) {
        return {
            type: 'api',
            message: error.message,
            originalError: error,
            shouldReport: error.isServerError(),
        };
    }

    // Validation Error
    if (error instanceof ValidationError) {
        return {
            type: 'validation',
            message: error.message,
            originalError: error,
            shouldReport: false,
        };
    }

    // Network Error
    if (error instanceof Error && error.message.includes('Network')) {
        return {
            type: 'network',
            message: 'Unable to connect. Please check your internet connection.',
            originalError: error,
            shouldReport: false,
        };
    }

    // Unknown Error
    const unknownError = error instanceof Error ? error : new Error(String(error));
    return {
        type: 'unknown',
        message: 'An unexpected error occurred. Please try again.',
        originalError: unknownError,
        shouldReport: true,
    };
}

/**
 * Report error to monitoring service
 */
export function reportError(error: Error, context?: Record<string, unknown>): void {
    logger.error('Error reported', { error, context });

    // TODO: Send to Sentry or other monitoring service
    // Sentry.captureException(error, { extra: context });
}

/**
 * Handle and optionally report error
 */
export function processError(error: unknown, context?: Record<string, unknown>): HandledError {
    const handled = handleError(error);

    if (handled.shouldReport) {
        reportError(handled.originalError, context);
    }

    return handled;
}
