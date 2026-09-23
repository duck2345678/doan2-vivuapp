/**
 * Google Geocoding API Service
 * 
 * Provides forward and reverse geocoding functionality.
 * - Forward: Address → Coordinates
 * - Reverse: Coordinates → Address
 * 
 * Required APIs: Geocoding API
 * Docs: https://developers.google.com/maps/documentation/geocoding
 */

import { env } from '@/config/env';

// ============================================================================
// Types
// ============================================================================

export interface GeocodingResult {
    formattedAddress: string;
    location: {
        latitude: number;
        longitude: number;
    };
    placeId: string;
    types: string[];
    addressComponents: AddressComponent[];
}

export interface AddressComponent {
    longName: string;
    shortName: string;
    types: string[];
}

export interface StructuredAddress {
    streetNumber?: string;
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
    province?: string;
    country?: string;
    postalCode?: string;
}

export interface GeocodeOptions {
    /** Language for results (default: 'vi') */
    language?: string;
    /** Restrict to specific country */
    region?: string;
}

export interface ReverseGeocodeOptions {
    /** Language for results (default: 'vi') */
    language?: string;
    /** Result type filter */
    resultType?: string[];
    /** Location type filter */
    locationType?: string[];
}

// ============================================================================
// Cache
// ============================================================================

const geocodeCache = new Map<string, { data: GeocodingResult[]; timestamp: number }>();
const reverseGeocodeCache = new Map<string, { data: GeocodingResult[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (geocoding results are stable)

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

const GEOCODING_API_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Convert address to coordinates (Forward Geocoding)
 */
export async function geocode(
    address: string,
    options: GeocodeOptions = {}
): Promise<GeocodingResult[]> {
    if (!address.trim()) {
        return [];
    }

    const cacheKey = `${address}_${JSON.stringify(options)}`;
    const cached = getCached(geocodeCache, cacheKey);
    if (cached) return cached;

    const apiKey = env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('Google Maps API key not configured');
        return [];
    }

    try {
        const params = new URLSearchParams({
            address,
            key: apiKey,
            language: options.language || 'vi',
        });

        if (options.region) {
            params.append('region', options.region);
        }

        const response = await fetch(`${GEOCODING_API_BASE}?${params}`);

        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            throw new Error(`Geocoding API status: ${data.status}`);
        }

        const results: GeocodingResult[] = (data.results || []).map((result: any) => ({
            formattedAddress: result.formatted_address,
            location: {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
            },
            placeId: result.place_id,
            types: result.types || [],
            addressComponents: (result.address_components || []).map((c: any) => ({
                longName: c.long_name,
                shortName: c.short_name,
                types: c.types,
            })),
        }));

        setCache(geocodeCache, cacheKey, results);
        return results;
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}

/**
 * Convert coordinates to address (Reverse Geocoding)
 */
export async function reverseGeocode(
    latitude: number,
    longitude: number,
    options: ReverseGeocodeOptions = {}
): Promise<GeocodingResult[]> {
    // Round to 5 decimal places for cache key (about 1m precision)
    const lat = Math.round(latitude * 100000) / 100000;
    const lng = Math.round(longitude * 100000) / 100000;

    const cacheKey = `${lat},${lng}_${JSON.stringify(options)}`;
    const cached = getCached(reverseGeocodeCache, cacheKey);
    if (cached) return cached;

    const apiKey = env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('Google Maps API key not configured');
        return [];
    }

    try {
        const params = new URLSearchParams({
            latlng: `${latitude},${longitude}`,
            key: apiKey,
            language: options.language || 'vi',
        });

        if (options.resultType && options.resultType.length > 0) {
            params.append('result_type', options.resultType.join('|'));
        }

        if (options.locationType && options.locationType.length > 0) {
            params.append('location_type', options.locationType.join('|'));
        }

        const response = await fetch(`${GEOCODING_API_BASE}?${params}`);

        if (!response.ok) {
            throw new Error(`Reverse Geocoding API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            throw new Error(`Reverse Geocoding API status: ${data.status}`);
        }

        const results: GeocodingResult[] = (data.results || []).map((result: any) => ({
            formattedAddress: result.formatted_address,
            location: {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
            },
            placeId: result.place_id,
            types: result.types || [],
            addressComponents: (result.address_components || []).map((c: any) => ({
                longName: c.long_name,
                shortName: c.short_name,
                types: c.types,
            })),
        }));

        setCache(reverseGeocodeCache, cacheKey, results);
        return results;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return [];
    }
}

/**
 * Get the first/best result from geocoding
 */
export async function geocodeFirst(
    address: string,
    options: GeocodeOptions = {}
): Promise<GeocodingResult | null> {
    const results = await geocode(address, options);
    return results[0] || null;
}

/**
 * Get the first/best result from reverse geocoding
 */
export async function reverseGeocodeFirst(
    latitude: number,
    longitude: number,
    options: ReverseGeocodeOptions = {}
): Promise<GeocodingResult | null> {
    const results = await reverseGeocode(latitude, longitude, options);
    return results[0] || null;
}

/**
 * Get a short, readable address from reverse geocoding
 * Useful for displaying pin location
 */
export async function getReadableAddress(
    latitude: number,
    longitude: number
): Promise<string> {
    const result = await reverseGeocodeFirst(latitude, longitude);
    if (!result) return 'Không xác định được địa chỉ';

    // Try to get a short address
    const structured = parseAddressComponents(result.addressComponents);

    // Format: Street, Ward/District
    const parts: string[] = [];

    if (structured.street) {
        if (structured.streetNumber) {
            parts.push(`${structured.streetNumber} ${structured.street}`);
        } else {
            parts.push(structured.street);
        }
    }

    if (structured.ward) {
        parts.push(structured.ward);
    } else if (structured.district) {
        parts.push(structured.district);
    }

    if (parts.length > 0) {
        return parts.join(', ');
    }

    // Fallback to formatted address
    return result.formattedAddress;
}

/**
 * Parse address components into structured format
 */
export function parseAddressComponents(components: AddressComponent[]): StructuredAddress {
    const result: StructuredAddress = {};

    for (const component of components) {
        if (component.types.includes('street_number')) {
            result.streetNumber = component.longName;
        }
        if (component.types.includes('route')) {
            result.street = component.longName;
        }
        if (component.types.includes('sublocality_level_1') || component.types.includes('ward')) {
            result.ward = component.longName;
        }
        if (component.types.includes('administrative_area_level_2') || component.types.includes('locality')) {
            result.district = component.longName;
        }
        if (component.types.includes('administrative_area_level_1')) {
            result.province = component.longName;
        }
        if (component.types.includes('country')) {
            result.country = component.longName;
        }
        if (component.types.includes('postal_code')) {
            result.postalCode = component.longName;
        }
    }

    return result;
}

/**
 * Clear geocoding caches
 */
export function clearGeocodingCache(): void {
    geocodeCache.clear();
    reverseGeocodeCache.clear();
}
