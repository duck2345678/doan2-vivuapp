/**
 * useDirections Hook
 *
 * Custom hook for fetching directions with:
 * - Route data and polyline coordinates
 * - Loading and error states
 * - Travel mode selection
 */

import {
    getDirections,
    type NavigationRoute,
    type TravelMode,
} from '@/lib/maps/googleMapsService';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapError } from '../services/GoogleMapsClient';

export interface LatLng {
    latitude: number;
    longitude: number;
}

export interface UseDirectionsOptions {
    /** Travel mode (default: 'driving') */
    mode?: TravelMode;
    /** Whether to auto-fetch on origin/destination change */
    autoFetch?: boolean;
    /** Whether to include alternatives */
    alternatives?: boolean;
}

export interface UseDirectionsResult {
    /** Route data including steps */
    route: NavigationRoute | null;
    /** Decoded polyline coordinates for map rendering */
    polylineCoords: LatLng[];
    /** Whether directions are being fetched */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Fetch directions */
    fetchRoute: () => Promise<void>;
    /** Clear route data */
    clearRoute: () => void;
    /** Change travel mode and refetch */
    setTravelMode: (mode: TravelMode) => void;
    /** Current travel mode */
    travelMode: TravelMode;
}

const DEFAULT_OPTIONS: UseDirectionsOptions = {
    mode: 'driving',
    autoFetch: false,
    alternatives: false,
};

export function useDirections(
    origin: LatLng | null,
    destination: LatLng | null,
    options: UseDirectionsOptions = {}
): UseDirectionsResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const [route, setRoute] = useState<NavigationRoute | null>(null);
    const [polylineCoords, setPolylineCoords] = useState<LatLng[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [travelMode, setTravelModeState] = useState<TravelMode>(opts.mode || 'driving');

    const isMounted = useRef(true);
    const lastFetchKey = useRef<string>('');

    // Cleanup on unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Fetch directions
    const fetchRoute = useCallback(async (): Promise<void> => {
        if (!origin || !destination) {
            setRoute(null);
            setPolylineCoords([]);
            return;
        }

        // Create fetch key to prevent duplicate requests
        const fetchKey = `${origin.latitude}_${origin.longitude}_${destination.latitude}_${destination.longitude}_${travelMode}`;
        if (fetchKey === lastFetchKey.current && route) {
            return; // Already fetched for this route
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await getDirections(origin, destination, {
                mode: travelMode,
            });

            if (isMounted.current) {
                setRoute(result);
                lastFetchKey.current = fetchKey;

                // Use polylinePoints directly as they are already decoded in NavigationRoute
                if (result.polylinePoints && result.polylinePoints.length > 0) {
                    setPolylineCoords(result.polylinePoints);
                } else {
                    setPolylineCoords([]);
                }
            }
        } catch (err) {
            console.error('Error fetching directions:', err);

            if (isMounted.current) {
                if (err instanceof MapError) {
                    setError(err.message);
                } else {
                    setError('Không thể lấy chỉ đường. Vui lòng thử lại.');
                }
                setRoute(null);
                setPolylineCoords([]);
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    }, [origin, destination, travelMode, route]);

    // Clear route data
    const clearRoute = useCallback((): void => {
        setRoute(null);
        setPolylineCoords([]);
        setError(null);
        lastFetchKey.current = '';
    }, []);

    // Change travel mode
    const setTravelMode = useCallback((mode: TravelMode): void => {
        setTravelModeState(mode);
        // Force refetch with new mode
        lastFetchKey.current = '';
    }, []);

    // Auto-fetch when origin/destination changes
    useEffect(() => {
        if (opts.autoFetch && origin && destination) {
            fetchRoute();
        }
    }, [
        origin?.latitude,
        origin?.longitude,
        destination?.latitude,
        destination?.longitude,
        travelMode,
        opts.autoFetch,
    ]);

    return {
        route,
        polylineCoords,
        isLoading,
        error,
        fetchRoute,
        clearRoute,
        setTravelMode,
        travelMode,
    };
}
