/**
 * Google Places API Service
 * 
 * Provides search and autocomplete functionality for places.
 * Uses Places API (New) for better performance and features.
 * 
 * Required APIs: Places API (New)
 * Docs: https://developers.google.com/maps/documentation/places/web-service
 */

import { env } from '@/config/env';
import { calculateHaversineDistance } from '@/lib/utils/haversine';
import { apiClient } from '@/lib/api';

// Geocoding Response from Spring Boot
export interface GeocodingResult {
    name: string;
    displayName: string;
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    osmId: string;
}

export interface GeocodingResponse {
    results: GeocodingResult[];
}

// ============================================================================
// Types
// ============================================================================

export interface PlacePrediction {
    placeId: string;
    mainText: string;
    secondaryText: string;
    description: string;
    types: string[];
    distanceMeters?: number;
}

export interface PlaceDetails {
    placeId: string;
    name: string;
    formattedAddress: string;
    location: {
        latitude: number;
        longitude: number;
    };
    types: string[];
    rating?: number;
    userRatingCount?: number;
    priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
    openingHours?: {
        openNow: boolean;
        weekdayDescriptions: string[];
    };
    photos?: PlacePhoto[];
    phoneNumber?: string;
    website?: string;
    // Extended fields
    editorialSummary?: string;
    businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
    internationalPhoneNumber?: string;
}

export interface PlacePhoto {
    name: string;
    widthPx: number;
    heightPx: number;
}

export interface NearbyPlace {
    placeId: string;
    name: string;
    location: {
        latitude: number;
        longitude: number;
    };
    types: string[];
    rating?: number;
    userRatingCount?: number;
    formattedAddress?: string;
    distanceMeters?: number;
}

export interface AutocompleteOptions {
    /** User's current location for biasing results */
    location?: { latitude: number; longitude: number };
    /** Search radius in meters (default: 50000) */
    radius?: number;
    /** Language for results (default: 'vi') */
    language?: string;
    /** Restrict to specific country (default: 'vn') */
    countries?: string[];
    /** Maximum number of results (default: 5) */
    limit?: number;
}

export interface NearbySearchOptions {
    /** Center of search area */
    location: { latitude: number; longitude: number };
    /** Search radius in meters (default: 1000) */
    radius?: number;
    /** Place types to include */
    includedTypes?: string[];
    /** Maximum number of results (default: 20) */
    maxResultCount?: number;
    /** Language for results (default: 'vi') */
    language?: string;
}

// ============================================================================
// Cache for API optimization
// ============================================================================

const autocompleteCache = new Map<string, { data: PlacePrediction[]; timestamp: number }>();
const detailsCache = new Map<string, { data: PlaceDetails; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// We will also keep a temporary cache of the full GeocodingResult by osmId
const geocodingCache = new Map<string, GeocodingResult>();

function getCached<T>(cache: Map<string, { data: T; timestamp: number }>, key: string): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCache<T>(cache: Map<string, { data: T; timestamp: number }>, key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// API Functions
// ============================================================================

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

/**
 * Autocomplete search for places
 * Returns suggestions as user types
 */
export async function autocomplete(
    query: string,
    options: AutocompleteOptions = {}
): Promise<PlacePrediction[]> {
    if (!query.trim() || query.length < 2) {
        return [];
    }

    const cacheKey = `${query}_${JSON.stringify(options)}`;
    const cached = getCached(autocompleteCache, cacheKey);
    if (cached) return cached;

    try {
        const queryParams = new URLSearchParams({
            q: query,
            limit: (options.limit || 5).toString(),
        });

        if (options.language) {
            queryParams.append('lang', options.language);
        }
        if (options.location) {
            queryParams.append('lat', options.location.latitude.toString());
            queryParams.append('lon', options.location.longitude.toString());
        }

        const response = await apiClient.get<GeocodingResponse>(`/api/geocoding/search?${queryParams.toString()}`);
        
        if (!response || !response.results) {
            return [];
        }

        const predictions: PlacePrediction[] = response.results.map((result) => {
            // Store full result in temporary cache for getPlaceDetails
            const placeId = result.osmId || `custom-${result.latitude}-${result.longitude}`;
            geocodingCache.set(placeId, result);

            return {
                placeId: placeId,
                mainText: result.name || result.displayName,
                secondaryText: result.city && result.country ? `${result.city}, ${result.country}` : result.country || '',
                description: result.displayName,
                types: ['geocode'],
                distanceMeters: undefined,
            };
        });

        setCache(autocompleteCache, cacheKey, predictions);
        return predictions;
    } catch (error) {
        console.error('Autocomplete error:', error);
        return [];
    }
}

/**
 * Get detailed information about a place
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    const cached = getCached(detailsCache, placeId);
    if (cached) return cached;

    try {
        // Try to get from local geocoding cache first (populated by autocomplete)
        const geocodingResult = geocodingCache.get(placeId);
        
        if (geocodingResult) {
            const details: PlaceDetails = {
                placeId: placeId,
                name: geocodingResult.name || geocodingResult.displayName,
                formattedAddress: geocodingResult.displayName,
                location: {
                    latitude: geocodingResult.latitude,
                    longitude: geocodingResult.longitude,
                },
                types: ['geocode'],
            };
            setCache(detailsCache, placeId, details);
            return details;
        }
        
        // If not in cache, we could implement a reverse geocoding or lookup endpoint
        // But for ViVu App's autocomplete flow, it should always be in cache
        console.warn(`Place details not found in local cache for ID: ${placeId}`);
        return null;
    } catch (error) {
        console.error('Place details error:', error);
        return null;
    }
}

/**
 * Search for nearby places by type
 */
export async function searchNearby(options: NearbySearchOptions): Promise<NearbyPlace[]> {
    const apiKey = env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('Google Maps API key not configured');
        return [];
    }

    try {
        const requestBody: Record<string, any> = {
            locationRestriction: {
                circle: {
                    center: {
                        latitude: options.location.latitude,
                        longitude: options.location.longitude,
                    },
                    radius: options.radius || 1000,
                },
            },
            maxResultCount: options.maxResultCount || 20,
            languageCode: options.language || 'vi',
        };

        if (options.includedTypes && options.includedTypes.length > 0) {
            requestBody.includedTypes = options.includedTypes;
        }

        const response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.rating,places.userRatingCount,places.formattedAddress',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Nearby Search API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        return (data.places || []).map((place: any) => {
            // Calculate distance from search center to place
            const distanceMeters = calculateHaversineDistance(
                options.location.latitude,
                options.location.longitude,
                place.location?.latitude || 0,
                place.location?.longitude || 0
            );

            return {
                placeId: place.id,
                name: place.displayName?.text || '',
                location: {
                    latitude: place.location?.latitude || 0,
                    longitude: place.location?.longitude || 0,
                },
                types: place.types || [],
                rating: place.rating,
                userRatingCount: place.userRatingCount,
                formattedAddress: place.formattedAddress,
                distanceMeters,
            };
        });
    } catch (error) {
        console.error('Nearby search error:', error);
        return [];
    }
}

/**
 * Get photo URL for a place photo
 */
export function getPhotoUrl(photoName: string, maxWidth: number = 400): string {
    const apiKey = env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || !photoName) return '';

    return `${PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
}

/**
 * Clear all caches
 */
export function clearPlacesCache(): void {
    autocompleteCache.clear();
    detailsCache.clear();
}

/**
 * Map Google place types to app categories
 * @deprecated Use mapGoogleTypeToCategory from '../utils/placeConverters' instead
 */
export { mapGoogleTypeToCategory as mapPlaceTypeToCategory } from '../utils/placeConverters';
