/**
 * Google Maps Client
 *
 * Unified client for all Google Maps API calls with:
 * - Automatic retry logic for transient failures
 * - Request caching with TTL
 * - Centralized error handling
 * - Request timeout management
 *
 * Inspired by @googlemaps/google-maps-services-js
 */

import { env } from '@/config/env';

// ============================================================================
// Types
// ============================================================================

export interface ClientConfig {
    /** API key for Google Maps */
    apiKey: string;
    /** Request timeout in ms (default: 10000) */
    timeout: number;
    /** Number of retry attempts (default: 3) */
    retryAttempts: number;
    /** Base delay between retries in ms (default: 1000) */
    retryDelay: number;
    /** Default language for responses (default: 'vi') */
    language: string;
}

export interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

export type MapErrorCode =
    | 'NETWORK_ERROR'
    | 'TIMEOUT'
    | 'API_ERROR'
    | 'QUOTA_EXCEEDED'
    | 'INVALID_REQUEST'
    | 'NOT_FOUND'
    | 'PERMISSION_DENIED'
    | 'UNKNOWN';

export class MapError extends Error {
    constructor(
        public readonly code: MapErrorCode,
        message: string,
        public readonly retryable: boolean = false,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'MapError';
    }

    static fromHttpStatus(status: number, message: string): MapError {
        if (status === 429) {
            return new MapError('QUOTA_EXCEEDED', 'API quota exceeded. Please try again later.', true);
        }
        if (status === 403) {
            return new MapError('PERMISSION_DENIED', 'API key invalid or missing permissions.', false);
        }
        if (status === 400) {
            return new MapError('INVALID_REQUEST', message, false);
        }
        if (status === 404) {
            return new MapError('NOT_FOUND', message, false);
        }
        if (status >= 500) {
            return new MapError('API_ERROR', 'Google Maps service error. Please try again.', true);
        }
        return new MapError('UNKNOWN', message, false);
    }

    static networkError(error: Error): MapError {
        if (error.message.includes('timeout')) {
            return new MapError('TIMEOUT', 'Request timed out. Please check your connection.', true, error);
        }
        return new MapError('NETWORK_ERROR', 'Network error. Please check your connection.', true, error);
    }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ClientConfig = {
    apiKey: env.GOOGLE_MAPS_API_KEY || '',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    language: 'vi',
};

// ============================================================================
// Google Maps Client Class
// ============================================================================

export class GoogleMapsClient {
    private readonly config: ClientConfig;
    private readonly cache: Map<string, CacheItem<unknown>> = new Map();
    private abortControllers: Map<string, AbortController> = new Map();

    constructor(config?: Partial<ClientConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        if (!this.config.apiKey) {
            console.warn('GoogleMapsClient: API key not configured');
        }
    }

    // --------------------------------------------------------------------------
    // Core Request Method
    // --------------------------------------------------------------------------

    async request<T>(
        url: string,
        options: RequestInit & {
            cacheKey?: string;
            cacheTTL?: number;
            skipCache?: boolean;
        } = {}
    ): Promise<T> {
        const { cacheKey, cacheTTL = 5 * 60 * 1000, skipCache = false, ...fetchOptions } = options;

        // Check cache first
        if (cacheKey && !skipCache) {
            const cached = this.getFromCache<T>(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }

        // Execute request with retry logic
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
            try {
                const result = await this.executeRequest<T>(url, fetchOptions);

                // Cache successful result
                if (cacheKey) {
                    this.setCache(cacheKey, result, cacheTTL);
                }

                return result;
            } catch (error) {
                lastError = error as Error;

                // Don't retry non-retryable errors
                if (error instanceof MapError && !error.retryable) {
                    throw error;
                }

                // Wait before retry with exponential backoff
                if (attempt < this.config.retryAttempts - 1) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError || new MapError('UNKNOWN', 'Request failed after retries', false);
    }

    private async executeRequest<T>(url: string, options: RequestInit): Promise<T> {
        const requestId = `${url}_${Date.now()}`;
        const controller = new AbortController();
        this.abortControllers.set(requestId, controller);

        // Set up timeout
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw MapError.fromHttpStatus(response.status, errorText);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof MapError) {
                throw error;
            }

            if ((error as Error).name === 'AbortError') {
                throw new MapError('TIMEOUT', 'Request timed out', true);
            }

            throw MapError.networkError(error as Error);
        } finally {
            clearTimeout(timeoutId);
            this.abortControllers.delete(requestId);
        }
    }

    // --------------------------------------------------------------------------
    // Cache Management
    // --------------------------------------------------------------------------

    private getFromCache<T>(key: string): T | null {
        const item = this.cache.get(key) as CacheItem<T> | undefined;

        if (!item) return null;

        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    private setCache<T>(key: string, data: T, ttl: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    clearCache(): void {
        this.cache.clear();
    }

    // --------------------------------------------------------------------------
    // Request Cancellation
    // --------------------------------------------------------------------------

    cancelAllRequests(): void {
        this.abortControllers.forEach((controller) => controller.abort());
        this.abortControllers.clear();
    }

    // --------------------------------------------------------------------------
    // Utilities
    // --------------------------------------------------------------------------

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    get apiKey(): string {
        return this.config.apiKey;
    }

    get language(): string {
        return this.config.language;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: GoogleMapsClient | null = null;

export function getGoogleMapsClient(): GoogleMapsClient {
    if (!clientInstance) {
        clientInstance = new GoogleMapsClient();
    }
    return clientInstance;
}

export function resetGoogleMapsClient(): void {
    if (clientInstance) {
        clientInstance.cancelAllRequests();
        clientInstance.clearCache();
    }
    clientInstance = null;
}
