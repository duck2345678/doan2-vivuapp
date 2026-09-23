/**
 * useNearbyPlaces Hook
 *
 * Custom hook for fetching nearby places with:
 * - Automatic refetching on location/category change
 * - Loading and error states
 * - Manual refresh capability
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MapError } from "../services/GoogleMapsClient";
import {
    mapPlaceTypeToCategory,
    searchNearby,
    type NearbyPlace,
} from "../services/placesService";
import type { Place, PlaceCategory, UserLocation } from "../types";

// Category to Google Place types mapping
const CATEGORY_TO_GOOGLE_TYPES: Record<PlaceCategory, string[]> = {
  restaurant: ["restaurant"],
  cafe: ["cafe"],
  hotel: ["lodging"],
  shopping: ["shopping_mall", "store"],
  entertainment: ["movie_theater", "amusement_park"],
  education: ["school", "university"],
  home: [],
  other: [],
};

export interface UseNearbyPlacesOptions {
  /** Search radius in meters */
  radius?: number;
  /** Maximum number of results */
  maxResults?: number;
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseNearbyPlacesResult {
  /** List of nearby places */
  places: NearbyPlace[];
  /** Converted places for UI display */
  displayPlaces: Place[];
  /** Whether places are being fetched */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refetch places */
  refetch: () => Promise<void>;
  /** Clear places list */
  clear: () => void;
}

const DEFAULT_OPTIONS: UseNearbyPlacesOptions = {
  radius: 2000,
  maxResults: 20,
  autoFetch: true,
};

export function useNearbyPlaces(
  location: UserLocation | null,
  category: PlaceCategory | "all",
  options: UseNearbyPlacesOptions = {},
): UseNearbyPlacesResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const lastFetchKey = useRef<string>("");

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Convert NearbyPlace to Place for UI
  const convertToDisplayPlace = useCallback(
    (nearbyPlace: NearbyPlace): Place => {
      return {
        id: nearbyPlace.placeId,
        name: nearbyPlace.name,
        category: mapPlaceTypeToCategory(nearbyPlace.types) as PlaceCategory,
        rating: nearbyPlace.rating || 4.0,
        ratingCount: nearbyPlace.userRatingCount,
        distanceKm: (nearbyPlace.distanceMeters || 0) / 1000,
        tags: [],
        thumbnail:
          "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
        lat: nearbyPlace.location.latitude,
        lng: nearbyPlace.location.longitude,
        address: nearbyPlace.formattedAddress,
        isOpen: undefined,
      };
    },
    [],
  );

  // Display places memoized
  const displayPlaces = places.map(convertToDisplayPlace);

  // Fetch nearby places
  const fetchPlaces = useCallback(async (): Promise<void> => {
    if (!location) {
      setPlaces([]);
      return;
    }

    // Get included types for category
    const includedTypes =
      category === "all" ? undefined : CATEGORY_TO_GOOGLE_TYPES[category];

    // Skip if category has no types (like 'home')
    if (includedTypes && includedTypes.length === 0) {
      setPlaces([]);
      return;
    }

    // Create fetch key to prevent duplicate requests
    const fetchKey = `${location.latitude}_${location.longitude}_${category}`;
    if (fetchKey === lastFetchKey.current && places.length > 0) {
      return; // Already fetched for this location/category
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await searchNearby({
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        radius: opts.radius,
        includedTypes,
        maxResultCount: opts.maxResults,
      });

      if (isMounted.current) {
        setPlaces(results);
        lastFetchKey.current = fetchKey;
      }
    } catch (err) {
      console.error("Error fetching nearby places:", err);

      if (isMounted.current) {
        if (err instanceof MapError) {
          setError(err.message);
        } else {
          setError("Không thể tải địa điểm gần đây. Vui lòng thử lại.");
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [location, category, opts.radius, opts.maxResults, places.length]);

  // Refetch function (force refresh)
  const refetch = useCallback(async (): Promise<void> => {
    lastFetchKey.current = ""; // Reset key to force refetch
    await fetchPlaces();
  }, [fetchPlaces]);

  // Clear places
  const clear = useCallback((): void => {
    setPlaces([]);
    setError(null);
    lastFetchKey.current = "";
  }, []);

  // Auto-fetch on location/category change
  useEffect(() => {
    if (opts.autoFetch) {
      fetchPlaces();
    }
  }, [location?.latitude, location?.longitude, category, opts.autoFetch]);

  return {
    places,
    displayPlaces,
    isLoading,
    error,
    refetch,
    clear,
  };
}
