/**
 * Google Distance Matrix API Service
 * 
 * Calculates travel distances and times between multiple origins and destinations.
 * Useful for ETA calculations, delivery routing, etc.
 * 
 * Required APIs: Distance Matrix API
 * Docs: https://developers.google.com/maps/documentation/distance-matrix
 */

import { env } from '@/config/env';

// ============================================================================
// Types
// ============================================================================

export interface DistanceMatrixLocation {
    latitude: number;
    longitude: number;
}

export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export interface DistanceMatrixElement {
    status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_ROUTE_LENGTH_EXCEEDED';
    distance?: {
        value: number; // meters
        text: string;  // e.g., "2.5 km"
    };
    duration?: {
        value: number; // seconds
        text: string;  // e.g., "8 phút"
    };
    durationInTraffic?: {
        value: number; // seconds
        text: string;
    };
}

export interface DistanceMatrixRow {
    elements: DistanceMatrixElement[];
}

export interface DistanceMatrixResult {
    originAddresses: string[];
    destinationAddresses: string[];
    rows: DistanceMatrixRow[];
}

export interface DistanceMatrixOptions {
    /** Travel mode (default: 'driving') */
    mode?: TravelMode;
    /** Language for results (default: 'vi') */
    language?: string;
    /** Avoid certain route features */
    avoid?: ('tolls' | 'highways' | 'ferries' | 'indoor')[];
    /** Unit system (default: 'metric') */
    units?: 'metric' | 'imperial';
    /** Use traffic data for driving mode */
    departureTime?: Date | 'now';
}

// ============================================================================
// Cache
// ============================================================================

const distanceCache = new Map<string, { data: DistanceMatrixResult; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached(key: string): DistanceMatrixResult | null {
    const cached = distanceCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    distanceCache.delete(key);
    return null;
}

function setCache(key: string, data: DistanceMatrixResult): void {
    distanceCache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// API Functions
// ============================================================================

const DISTANCE_MATRIX_API_BASE = 'https://maps.googleapis.com/maps/api/distancematrix/json';

/**
 * Format location for API request
 */
function formatLocation(loc: DistanceMatrixLocation): string {
    return `${loc.latitude},${loc.longitude}`;
}

function formatLocations(locs: DistanceMatrixLocation[]): string {
    return locs.map(formatLocation).join('|');
}

/**
 * Get distance and duration between origins and destinations
 */
export async function getDistanceMatrix(
    origins: DistanceMatrixLocation[],
    destinations: DistanceMatrixLocation[],
    options: DistanceMatrixOptions = {}
): Promise<DistanceMatrixResult | null> {
    if (origins.length === 0 || destinations.length === 0) {
        return null;
    }

    // Limit to 25 origins or destinations per request (API limit)
    if (origins.length > 25 || destinations.length > 25) {
        console.warn('Distance Matrix API limit: max 25 origins or destinations');
        origins = origins.slice(0, 25);
        destinations = destinations.slice(0, 25);
    }

    const originsStr = formatLocations(origins);
    const destStr = formatLocations(destinations);
    const cacheKey = `${originsStr}_${destStr}_${options.mode || 'driving'}`;

    const cached = getCached(cacheKey);
    if (cached) return cached;

    const apiKey = env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('Google Maps API key not configured');
        return null;
    }

    try {
        const params = new URLSearchParams({
            origins: originsStr,
            destinations: destStr,
            key: apiKey,
            mode: options.mode || 'driving',
            language: options.language || 'vi',
            units: options.units || 'metric',
        });

        if (options.avoid && options.avoid.length > 0) {
            params.append('avoid', options.avoid.join('|'));
        }

        if (options.departureTime) {
            if (options.departureTime === 'now') {
                params.append('departure_time', 'now');
            } else {
                params.append('departure_time', Math.floor(options.departureTime.getTime() / 1000).toString());
            }
        }

        const response = await fetch(`${DISTANCE_MATRIX_API_BASE}?${params}`);

        if (!response.ok) {
            throw new Error(`Distance Matrix API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(`Distance Matrix API status: ${data.status}`);
        }

        const result: DistanceMatrixResult = {
            originAddresses: data.origin_addresses || [],
            destinationAddresses: data.destination_addresses || [],
            rows: (data.rows || []).map((row: any) => ({
                elements: (row.elements || []).map((el: any) => ({
                    status: el.status,
                    distance: el.distance ? {
                        value: el.distance.value,
                        text: el.distance.text,
                    } : undefined,
                    duration: el.duration ? {
                        value: el.duration.value,
                        text: el.duration.text,
                    } : undefined,
                    durationInTraffic: el.duration_in_traffic ? {
                        value: el.duration_in_traffic.value,
                        text: el.duration_in_traffic.text,
                    } : undefined,
                })),
            })),
        };

        setCache(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Distance Matrix error:', error);
        return null;
    }
}

/**
 * Get distance and duration between two points (simplified)
 */
export async function getDistance(
    origin: DistanceMatrixLocation,
    destination: DistanceMatrixLocation,
    options: DistanceMatrixOptions = {}
): Promise<DistanceMatrixElement | null> {
    const result = await getDistanceMatrix([origin], [destination], options);

    if (!result || result.rows.length === 0 || result.rows[0].elements.length === 0) {
        return null;
    }

    return result.rows[0].elements[0];
}

/**
 * Get distances from one origin to multiple destinations
 */
export async function getDistancesFromOrigin(
    origin: DistanceMatrixLocation,
    destinations: DistanceMatrixLocation[],
    options: DistanceMatrixOptions = {}
): Promise<DistanceMatrixElement[]> {
    const result = await getDistanceMatrix([origin], destinations, options);

    if (!result || result.rows.length === 0) {
        return [];
    }

    return result.rows[0].elements;
}

/**
 * Find the nearest destination from multiple options
 */
export async function findNearest(
    origin: DistanceMatrixLocation,
    destinations: DistanceMatrixLocation[],
    options: DistanceMatrixOptions = {}
): Promise<{ index: number; element: DistanceMatrixElement } | null> {
    const elements = await getDistancesFromOrigin(origin, destinations, options);

    if (elements.length === 0) {
        return null;
    }

    let nearestIndex = -1;
    let nearestDistance = Infinity;

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.status === 'OK' && el.distance && el.distance.value < nearestDistance) {
            nearestIndex = i;
            nearestDistance = el.distance.value;
        }
    }

    if (nearestIndex === -1) {
        return null;
    }

    return {
        index: nearestIndex,
        element: elements[nearestIndex],
    };
}

/**
 * Sort destinations by distance from origin
 */
export async function sortByDistance(
    origin: DistanceMatrixLocation,
    destinations: DistanceMatrixLocation[],
    options: DistanceMatrixOptions = {}
): Promise<{ location: DistanceMatrixLocation; element: DistanceMatrixElement }[]> {
    const elements = await getDistancesFromOrigin(origin, destinations, options);

    const combined = destinations.map((loc, i) => ({
        location: loc,
        element: elements[i] || { status: 'NOT_FOUND' as const },
    }));

    return combined
        .filter(item => item.element.status === 'OK' && item.element.distance)
        .sort((a, b) => (a.element.distance?.value || 0) - (b.element.distance?.value || 0));
}

/**
 * Format duration in human-readable Vietnamese
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return 'Dưới 1 phút';
    }

    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
        return `${minutes} phút`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return `${hours} giờ`;
    }

    return `${hours} giờ ${remainingMinutes} phút`;
}

/**
 * Format distance in human-readable Vietnamese
 */
export function formatDistanceText(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }

    const km = meters / 1000;

    if (km < 10) {
        return `${km.toFixed(1)} km`;
    }

    return `${Math.round(km)} km`;
}

/**
 * Clear distance cache
 */
export function clearDistanceCache(): void {
    distanceCache.clear();
}
