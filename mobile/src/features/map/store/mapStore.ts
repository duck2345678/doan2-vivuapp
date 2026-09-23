/**
 * Map Store - Zustand store for map state management
 * 
 * Manages:
 * - Selected place
 * - Active category filter
 * - Search query
 * - Map region
 * - User location
 * - Map display options (traffic, map type)
 */

import { create } from 'zustand';
import type { MapRegion, MapState, PlaceCategory, UserLocation } from '../types';

// Default region: Ho Chi Minh City, Vietnam (University area)
const DEFAULT_REGION: MapRegion = {
    latitude: 10.7626,
    longitude: 106.6824,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
};

const initialState = {
    selectedPlaceId: null as string | null,
    activeCategory: 'all' as PlaceCategory | 'all',
    searchQuery: '',
    isSearchFocused: false,
    region: DEFAULT_REGION,
    userLocation: null as UserLocation | null,
    isLoadingLocation: false,
    // Map display options
    showsTraffic: false,
    mapType: 'standard' as 'standard' | 'satellite' | 'hybrid',
};

export const useMapStore = create<MapState>((set) => ({
    // Initial state
    ...initialState,

    // Actions
    setSelectedPlaceId: (id: string | null) =>
        set({ selectedPlaceId: id }),

    setActiveCategory: (category: PlaceCategory | 'all') =>
        set({ activeCategory: category }),

    setSearchQuery: (query: string) =>
        set({ searchQuery: query }),

    setIsSearchFocused: (focused: boolean) =>
        set({ isSearchFocused: focused }),

    setRegion: (region: MapRegion) =>
        set({ region }),

    setUserLocation: (location: UserLocation | null) =>
        set({ userLocation: location }),

    setIsLoadingLocation: (loading: boolean) =>
        set({ isLoadingLocation: loading }),

    setShowsTraffic: (shows: boolean) =>
        set({ showsTraffic: shows }),

    setMapType: (type: 'standard' | 'satellite' | 'hybrid') =>
        set({ mapType: type }),

    resetMapState: () =>
        set(initialState),
}));

/**
 * Selector hooks for specific state slices
 */
export const useSelectedPlaceId = () => useMapStore((state) => state.selectedPlaceId);
export const useActiveCategory = () => useMapStore((state) => state.activeCategory);
export const useSearchQuery = () => useMapStore((state) => state.searchQuery);
export const useMapRegion = () => useMapStore((state) => state.region);
export const useUserLocation = () => useMapStore((state) => state.userLocation);
export const useShowsTraffic = () => useMapStore((state) => state.showsTraffic);
export const useMapType = () => useMapStore((state) => state.mapType);
