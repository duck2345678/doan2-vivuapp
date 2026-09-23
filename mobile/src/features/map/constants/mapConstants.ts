/**
 * Map Constants
 *
 * Single source of truth for map-related constants including:
 * - Category mappings
 * - API configuration
 * - Animation durations
 */

import type { PlaceCategory } from '../types';

// ============================================================================
// Category Mappings
// ============================================================================

/**
 * Map Google Place types to app categories
 */
export const GOOGLE_TYPE_TO_CATEGORY: Record<string, PlaceCategory> = {
    restaurant: 'restaurant',
    food: 'restaurant',
    meal_takeaway: 'restaurant',
    cafe: 'cafe',
    coffee_shop: 'cafe',
    lodging: 'hotel',
    hotel: 'hotel',
    shopping_mall: 'shopping',
    store: 'shopping',
    supermarket: 'shopping',
    movie_theater: 'entertainment',
    amusement_park: 'entertainment',
    night_club: 'entertainment',
    school: 'education',
    university: 'education',
    library: 'education',
};

/**
 * Map app categories to Google Place types for search
 */
export const CATEGORY_TO_GOOGLE_TYPES: Record<PlaceCategory, string[]> = {
    restaurant: ['restaurant'],
    cafe: ['cafe'],
    hotel: ['lodging'],
    shopping: ['shopping_mall', 'store'],
    entertainment: ['movie_theater', 'amusement_park'],
    education: ['school', 'university'],
    home: [],
    other: [],
};

/**
 * Category display configuration
 */
export const CATEGORY_CONFIG: Record<PlaceCategory | 'all', { icon: string; label: string }> = {
    all: { icon: 'explore', label: 'Tất cả' },
    restaurant: { icon: 'restaurant', label: 'Nhà hàng' },
    cafe: { icon: 'local-cafe', label: 'Cafe' },
    hotel: { icon: 'hotel', label: 'Khách sạn' },
    shopping: { icon: 'shopping-bag', label: 'Mua sắm' },
    entertainment: { icon: 'sports-esports', label: 'Giải trí' },
    education: { icon: 'school', label: 'Giáo dục' },
    home: { icon: 'home', label: 'Nhà' },
    other: { icon: 'place', label: 'Khác' },
};

/**
 * Category chips for map filter UI
 */
export const CATEGORY_CHIPS: { id: PlaceCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'Tất cả', icon: 'apps' },
    { id: 'home', label: 'Nhà', icon: 'home' },
    { id: 'restaurant', label: 'Nhà hàng', icon: 'restaurant' },
    { id: 'hotel', label: 'Khách sạn', icon: 'hotel' },
    { id: 'shopping', label: 'Mua sắm', icon: 'shopping-bag' },
    { id: 'cafe', label: 'Quán cà phê', icon: 'local-cafe' },
    { id: 'entertainment', label: 'Giải trí', icon: 'sports-esports' },
];

// ============================================================================
// Map Configuration
// ============================================================================

export const MAP_CONFIG = {
    /** Default search radius in meters */
    DEFAULT_RADIUS: 2000,
    /** Maximum number of nearby places to fetch */
    MAX_NEARBY_RESULTS: 20,
    /** Animation durations in milliseconds */
    ANIMATION_DURATION: {
        CAMERA: 500,
        MARKER: 300,
        MODAL: 250,
    },
    /** Default region (Ho Chi Minh City, Vietnam) */
    DEFAULT_REGION: {
        latitude: 10.7626,
        longitude: 106.6824,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    },
} as const;

// ============================================================================
// Map Type Options
// ============================================================================

export type MapTypeOption = 'standard' | 'satellite' | 'hybrid';

export const MAP_TYPE_OPTIONS: { id: MapTypeOption; label: string; icon: string }[] = [
    { id: 'standard', label: 'Tiêu chuẩn', icon: 'map' },
    { id: 'satellite', label: 'Vệ tinh', icon: 'satellite' },
    { id: 'hybrid', label: 'Kết hợp', icon: 'layers' },
];
