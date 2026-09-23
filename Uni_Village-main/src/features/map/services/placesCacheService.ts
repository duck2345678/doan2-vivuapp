/**
 * Places Cache Service
 *
 * Provides AsyncStorage-based caching for places data
 * Enables offline access to previously fetched places
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place } from '../types';

// Cache keys
const CACHE_KEYS = {
    PLACES: '@map/cached_places',
    NEARBY: '@map/cached_nearby',
    PLACE_DETAILS: '@map/place_details_',
    LAST_UPDATED: '@map/cache_last_updated',
} as const;

// Cache TTL (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

/**
 * Check if cache entry is still valid
 */
function isValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
}

/**
 * Create a cache entry with TTL
 */
function createEntry<T>(data: T, ttl: number = CACHE_TTL): CacheEntry<T> {
    const now = Date.now();
    return {
        data,
        timestamp: now,
        expiresAt: now + ttl,
    };
}

// ============================================================================
// Nearby Places Cache
// ============================================================================

interface NearbyPlacesKey {
    lat: number;
    lng: number;
    category?: string;
}

function getNearbyKey(location: NearbyPlacesKey): string {
    const lat = location.lat.toFixed(4);
    const lng = location.lng.toFixed(4);
    const cat = location.category || 'all';
    return `${CACHE_KEYS.NEARBY}_${lat}_${lng}_${cat}`;
}

/**
 * Cache nearby places results
 */
export async function cacheNearbyPlaces(
    location: NearbyPlacesKey,
    places: Place[],
    ttl?: number
): Promise<void> {
    try {
        const key = getNearbyKey(location);
        const entry = createEntry(places, ttl);
        await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
        console.warn('Failed to cache nearby places:', error);
    }
}

/**
 * Get cached nearby places
 */
export async function getCachedNearbyPlaces(
    location: NearbyPlacesKey
): Promise<Place[] | null> {
    try {
        const key = getNearbyKey(location);
        const raw = await AsyncStorage.getItem(key);

        if (!raw) return null;

        const entry: CacheEntry<Place[]> = JSON.parse(raw);
        return isValid(entry) ? entry.data : null;
    } catch (error) {
        console.warn('Failed to get cached nearby places:', error);
        return null;
    }
}

// ============================================================================
// Place Details Cache
// ============================================================================

/**
 * Cache place details
 */
export async function cachePlaceDetails(
    placeId: string,
    place: Place,
    ttl?: number
): Promise<void> {
    try {
        const key = `${CACHE_KEYS.PLACE_DETAILS}${placeId}`;
        const entry = createEntry(place, ttl);
        await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
        console.warn('Failed to cache place details:', error);
    }
}

/**
 * Get cached place details
 */
export async function getCachedPlaceDetails(
    placeId: string
): Promise<Place | null> {
    try {
        const key = `${CACHE_KEYS.PLACE_DETAILS}${placeId}`;
        const raw = await AsyncStorage.getItem(key);

        if (!raw) return null;

        const entry: CacheEntry<Place> = JSON.parse(raw);
        return isValid(entry) ? entry.data : null;
    } catch (error) {
        console.warn('Failed to get cached place details:', error);
        return null;
    }
}

// ============================================================================
// Generic Cache Operations
// ============================================================================

/**
 * Clear all map-related cache
 */
export async function clearMapCache(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const mapKeys = keys.filter(key => key.startsWith('@map/'));
        await AsyncStorage.multiRemove(mapKeys);
    } catch (error) {
        console.warn('Failed to clear map cache:', error);
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
    entryCount: number;
    totalSizeKB: number;
}> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const mapKeys = keys.filter(key => key.startsWith('@map/'));

        let totalSize = 0;
        for (const key of mapKeys) {
            const value = await AsyncStorage.getItem(key);
            if (value) {
                totalSize += value.length;
            }
        }

        return {
            entryCount: mapKeys.length,
            totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
        };
    } catch (error) {
        console.warn('Failed to get cache stats:', error);
        return { entryCount: 0, totalSizeKB: 0 };
    }
}

/**
 * Remove expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const mapKeys = keys.filter(key => key.startsWith('@map/'));

        let removedCount = 0;
        for (const key of mapKeys) {
            const raw = await AsyncStorage.getItem(key);
            if (raw) {
                try {
                    const entry: CacheEntry<unknown> = JSON.parse(raw);
                    if (!isValid(entry)) {
                        await AsyncStorage.removeItem(key);
                        removedCount++;
                    }
                } catch {
                    // Invalid JSON, remove
                    await AsyncStorage.removeItem(key);
                    removedCount++;
                }
            }
        }

        return removedCount;
    } catch (error) {
        console.warn('Failed to cleanup expired cache:', error);
        return 0;
    }
}
