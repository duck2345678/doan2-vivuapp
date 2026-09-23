/**
 * useUserLocation Hook
 *
 * Custom hook for managing user location with:
 * - Permission handling
 * - Location watching
 * - Error states
 * - Refresh capability
 */

import * as ExpoLocation from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import type { UserLocation } from '../types';

export interface LocationOptions {
    /** Enable continuous location updates */
    enableWatch?: boolean;
    /** Location accuracy level */
    accuracy?: ExpoLocation.Accuracy;
    /** Minimum distance (meters) for location updates */
    distanceInterval?: number;
    /** Minimum time (ms) between location updates */
    timeInterval?: number;
}

export interface UseUserLocationResult {
    /** Current user location */
    location: UserLocation | null;
    /** Whether location is being fetched */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Permission status */
    permissionStatus: ExpoLocation.PermissionStatus | null;
    /** Request location permission */
    requestPermission: () => Promise<boolean>;
    /** Refresh current location */
    refresh: () => Promise<void>;
    /** Start watching location */
    startWatching: () => Promise<void>;
    /** Stop watching location */
    stopWatching: () => void;
}

const DEFAULT_OPTIONS: LocationOptions = {
    enableWatch: false,
    accuracy: ExpoLocation.Accuracy.Balanced,
    distanceInterval: 10,
    timeInterval: 5000,
};

export function useUserLocation(options: LocationOptions = {}): UseUserLocationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const [location, setLocation] = useState<UserLocation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<ExpoLocation.PermissionStatus | null>(
        null
    );

    const watchSubscription = useRef<ExpoLocation.LocationSubscription | null>(null);
    const isMounted = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (watchSubscription.current) {
                watchSubscription.current.remove();
            }
        };
    }, []);

    // Request permission
    const requestPermission = useCallback(async (): Promise<boolean> => {
        try {
            const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
            if (isMounted.current) {
                setPermissionStatus(status);
            }

            if (status !== 'granted') {
                if (isMounted.current) {
                    setError('Vui lòng cấp quyền truy cập vị trí để sử dụng tính năng này');
                }

                // Show settings dialog
                Alert.alert(
                    'Cần quyền vị trí',
                    'Vui lòng cho phép truy cập vị trí trong Cài đặt để sử dụng đầy đủ tính năng bản đồ.',
                    [
                        { text: 'Để sau', style: 'cancel' },
                        {
                            text: 'Mở Cài đặt',
                            onPress: () => {
                                if (Platform.OS === 'ios') {
                                    Linking.openURL('app-settings:');
                                } else {
                                    Linking.openSettings();
                                }
                            },
                        },
                    ]
                );

                return false;
            }

            return true;
        } catch (err) {
            console.error('Error requesting location permission:', err);
            if (isMounted.current) {
                setError('Không thể yêu cầu quyền vị trí');
            }
            return false;
        }
    }, []);

    // Get current location
    const refresh = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            // Check permission first
            const { status } = await ExpoLocation.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                const granted = await requestPermission();
                if (!granted) {
                    setIsLoading(false);
                    return;
                }
            }

            const result = await ExpoLocation.getCurrentPositionAsync({
                accuracy: opts.accuracy,
            });

            if (isMounted.current) {
                setLocation({
                    latitude: result.coords.latitude,
                    longitude: result.coords.longitude,
                    accuracy: result.coords.accuracy ?? undefined,
                    timestamp: result.timestamp,
                });
                setError(null);
            }
        } catch (err) {
            console.error('Error getting location:', err);
            if (isMounted.current) {
                setError('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra GPS.');
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    }, [opts.accuracy, requestPermission]);

    // Start watching location
    const startWatching = useCallback(async (): Promise<void> => {
        if (watchSubscription.current) {
            return; // Already watching
        }

        try {
            const { status } = await ExpoLocation.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                const granted = await requestPermission();
                if (!granted) return;
            }

            watchSubscription.current = await ExpoLocation.watchPositionAsync(
                {
                    accuracy: opts.accuracy,
                    distanceInterval: opts.distanceInterval,
                    timeInterval: opts.timeInterval,
                },
                (newLocation) => {
                    if (isMounted.current) {
                        setLocation({
                            latitude: newLocation.coords.latitude,
                            longitude: newLocation.coords.longitude,
                            accuracy: newLocation.coords.accuracy ?? undefined,
                            timestamp: newLocation.timestamp,
                        });
                        setError(null);
                    }
                }
            );
        } catch (err) {
            console.error('Error watching location:', err);
            if (isMounted.current) {
                setError('Không thể theo dõi vị trí');
            }
        }
    }, [opts.accuracy, opts.distanceInterval, opts.timeInterval, requestPermission]);

    // Stop watching location
    const stopWatching = useCallback((): void => {
        if (watchSubscription.current) {
            watchSubscription.current.remove();
            watchSubscription.current = null;
        }
    }, []);

    // Auto-fetch location on mount
    useEffect(() => {
        refresh();

        if (opts.enableWatch) {
            startWatching();
        }
    }, []);

    return {
        location,
        isLoading,
        error,
        permissionStatus,
        requestPermission,
        refresh,
        startWatching,
        stopWatching,
    };
}
