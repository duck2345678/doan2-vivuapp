export interface Place {
    id: string;
    name: string;
    category: PlaceCategory;
    rating: number;
    ratingCount?: number;
    distanceKm: number;
    tags: string[];
    thumbnail: string;
    lat: number;
    lng: number;
    address?: string;
    description?: string;
    isOpen?: boolean;
    priceLevel?: 1 | 2 | 3 | 4; // $ to $$$$
    // Extended fields for Place Details
    businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
    editorialSummary?: string;
    phone?: string;
    internationalPhone?: string;
    website?: string;
    photos?: PlacePhoto[];
    openingHoursText?: string[];
    reviews?: Review[];
}

export interface Review {
    id: string;
    authorName: string;
    authorPhoto?: string;
    rating: number;
    text: string;
    relativeTimeDescription: string;
}

export interface PlacePhoto {
    name: string;
    widthPx: number;
    heightPx: number;
    url?: string;
}

export type PlaceCategory =
    | 'home'
    | 'restaurant'
    | 'hotel'
    | 'shopping'
    | 'cafe'
    | 'entertainment'
    | 'education'
    | 'other';

export interface CategoryChip {
    id: PlaceCategory | 'all';
    label: string;
    icon: string;
}

export interface MapMarker {
    id: string;
    coordinate: {
        latitude: number;
        longitude: number;
    };
    title?: string;
    description?: string;
    category: PlaceCategory;
}

export interface MapRegion {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

export interface UserLocation {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
}

export interface MapState {
    selectedPlaceId: string | null;
    activeCategory: PlaceCategory | 'all';
    searchQuery: string;
    isSearchFocused: boolean;

    region: MapRegion;
    userLocation: UserLocation | null;
    isLoadingLocation: boolean;

    // Map display options
    showsTraffic: boolean;
    mapType: 'standard' | 'satellite' | 'hybrid';

    setSelectedPlaceId: (id: string | null) => void;
    setActiveCategory: (category: PlaceCategory | 'all') => void;
    setSearchQuery: (query: string) => void;
    setIsSearchFocused: (focused: boolean) => void;
    setRegion: (region: MapRegion) => void;
    setUserLocation: (location: UserLocation | null) => void;
    setIsLoadingLocation: (loading: boolean) => void;
    setShowsTraffic: (shows: boolean) => void;
    setMapType: (type: 'standard' | 'satellite' | 'hybrid') => void;
    resetMapState: () => void;
}

// ============================================================================
// Google Maps API Types (re-exported from services for convenience)
// ============================================================================

/** Location selected via LocationPicker */
export interface SelectedLocation {
    latitude: number;
    longitude: number;
    address: string;
}

/** Route information for navigation display */
export interface RouteInfo {
    distance: string;
    duration: string;
    isLoading: boolean;
}

/** Direction waypoint for multi-stop routing */
export interface Waypoint {
    latitude: number;
    longitude: number;
    name?: string;
    placeId?: string;
}

/** Search result for unified place search */
export interface SearchResult {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category?: PlaceCategory;
    rating?: number;
    isFromApi: boolean; // true = from Google API
}

