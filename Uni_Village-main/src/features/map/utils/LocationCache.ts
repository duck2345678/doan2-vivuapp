/**
 * Location Cache with LRU Eviction Strategy
 *
 * Stores location coordinates with a fixed size limit to prevent memory leaks.
 * Uses Least Recently Used (LRU) eviction policy.
 */

interface Coordinates {
    lat: number;
    lng: number;
}

export class LocationCache {
    private cache = new Map<string, Coordinates>();
    private readonly limit: number;

    constructor(limit: number = 100) {
        this.limit = limit;
    }

    /**
     * Get a location from the cache
     * Updates the access order (marks as recently used)
     */
    get(key: string): Coordinates | undefined {
        if (!this.cache.has(key)) {
            return undefined;
        }

        // Refresh insertion order (delete and set)
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);

        return value;
    }

    /**
     * Add or update a location in the cache
     * Evicts the least recently used item if the cache is full
     */
    set(key: string, value: Coordinates): void {
        if (this.cache.has(key)) {
            // If exists, update and refresh order
            this.cache.delete(key);
        } else if (this.cache.size >= this.limit) {
            // If new and full, evict oldest (first item in Map)
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }

    /**
     * Check if a key exists in the cache
     * Note: Does NOT update access order
     */
    has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Get current size of the cache
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Clear the cache
     */
    clear(): void {
        this.cache.clear();
    }
}
