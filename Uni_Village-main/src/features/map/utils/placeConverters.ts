/**
 * Place Converters
 *
 * Utility functions to convert between different place data formats.
 * Single source of truth for place transformations.
 */

import { env } from '@/config/env';
import { GOOGLE_TYPE_TO_CATEGORY } from '../constants/mapConstants';
import type { NearbyPlace, PlaceDetails } from '../services/placesService';
import type { Place, PlaceCategory } from '../types';

/**
 * Map Google Place types to app categories
 */
export function mapGoogleTypeToCategory(types: string[]): PlaceCategory {
    for (const type of types) {
        if (GOOGLE_TYPE_TO_CATEGORY[type]) {
            return GOOGLE_TYPE_TO_CATEGORY[type];
        }
    }
    return 'other';
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Convert NearbyPlace (from API) to Place (for UI display)
 */
export function convertNearbyPlaceToPlace(nearbyPlace: NearbyPlace): Place {
    return {
        id: nearbyPlace.placeId,
        name: nearbyPlace.name,
        category: mapGoogleTypeToCategory(nearbyPlace.types),
        rating: nearbyPlace.rating || 4.0,
        ratingCount: nearbyPlace.userRatingCount,
        distanceKm: (nearbyPlace.distanceMeters || 0) / 1000,
        tags: [],
        thumbnail: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
        lat: nearbyPlace.location.latitude,
        lng: nearbyPlace.location.longitude,
        address: nearbyPlace.formattedAddress,
        isOpen: undefined,
    };
}

/**
 * Generate Place photo URL from Google Places API photo name
 */
export function getPlacePhotoUrl(photoName: string, maxWidth: number = 400): string {
    const apiKey = env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || !photoName) return '';
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
}

/**
 * Convert PlaceDetails (from API) to Place (for UI display)
 */
export function convertPlaceDetailsToPlace(details: PlaceDetails): Place {
    const thumbnail =
        details.photos && details.photos.length > 0
            ? getPlacePhotoUrl(details.photos[0].name)
            : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400';

    return {
        id: details.placeId,
        name: details.name,
        category: mapGoogleTypeToCategory(details.types),
        rating: details.rating || 4.0,
        ratingCount: details.userRatingCount,
        distanceKm: 0,
        tags: [],
        thumbnail,
        lat: details.location.latitude,
        lng: details.location.longitude,
        address: details.formattedAddress,
        isOpen: details.openingHours?.openNow,
        // Extended fields
        photos: details.photos,
        editorialSummary: details.editorialSummary,
        businessStatus: details.businessStatus,
        phone: details.phoneNumber,
        internationalPhone: details.internationalPhoneNumber,
        website: details.website,
        openingHoursText: details.openingHours?.weekdayDescriptions,
    };
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
}

