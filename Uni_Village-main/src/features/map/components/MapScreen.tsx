/**
 * MapScreen - Fully integrated with Google Maps APIs (Redesigned UI/UX)
 *
 * REFACTORED: Using shared utilities and extracted components
 * - Removed duplicate category mappings (now in constants)
 * - Removed inline conversion functions (now in utils)
 * - Using extracted overlay components
 *
 * Features:
 * - Places Autocomplete for search
 * - Nearby search based on user location
 * - Directions with route overlay
 * - Category filtering with modal selector
 * - Bottom Sheet for place details (Gorhom)
 * - Navigation Banner for turn-by-turn
 * - Map type switching with modal
 */

import {
    getDirections,
    type NavigationRoute,
    type TravelMode,
} from '@/lib/maps/googleMapsService';
import { useColorScheme } from '@/shared/hooks/useColorScheme';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
    CATEGORY_TO_GOOGLE_TYPES,
    MAP_CONFIG,
    type MapTypeOption,
} from '../constants/mapConstants';
import {
    getPlaceDetails,
    searchNearby,
    type NearbyPlace,
    type PlaceDetails,
} from '../services/placesService';
import { useMapStore } from '../store/mapStore';
import type { MapMarker, Place, PlaceCategory, UserLocation } from '../types';
import {
    convertNearbyPlaceToPlace,
    convertPlaceDetailsToPlace,
    mapGoogleTypeToCategory,
} from '../utils/placeConverters';
import { DirectionsSetup } from './DirectionsSetup';
import { MapAdapter, MapAdapterRef } from './MapAdapter';
import { MapControls } from './MapControls';
import { MapSearchOverlay } from './MapSearchOverlay';
import { MapTypeSelectorModal } from './MapTypeSelectorModal';
import { NavigationBanner } from './NavigationBanner';
import { NavigationControls } from './NavigationControls';
import { OfflineBanner } from './OfflineBanner';
import { PlaceBottomSheet, PlaceBottomSheetRef } from './PlaceBottomSheet';
import { RouteOverlay } from './RouteOverlay';

export function MapScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const mapRef = useRef<MapAdapterRef>(null);
    const bottomSheetRef = useRef<PlaceBottomSheetRef>(null);

    // Store state
    const {
        activeCategory,
        searchQuery,
        region,
        userLocation,
        isLoadingLocation,
        showsTraffic,
        setActiveCategory,
        setSearchQuery,
        setUserLocation,
        setIsLoadingLocation,
        setShowsTraffic,
    } = useMapStore();

    // Local UI state
    const [places, setPlaces] = useState<NearbyPlace[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
    const [recentlyViewed, setRecentlyViewed] = useState<Place[]>([]);

    // Enhanced UI state
    const [showDirectionsSetup, setShowDirectionsSetup] = useState(false);

    // Map display state
    const [mapType, setMapType] = useState<MapTypeOption>('standard');
    const [showMapTypeModal, setShowMapTypeModal] = useState(false);

    // Route state
    const [navigationRoute, setNavigationRoute] = useState<NavigationRoute | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [showRouteOverlay, setShowRouteOverlay] = useState(false);

    // Navigation state
    const [isNavigating, setIsNavigating] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Sorting Logic - Always sort by distance
    const sortedPlaces = useMemo(() => {
        return [...places].sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }, [places]);

    // Convert places to markers
    const markers: MapMarker[] = sortedPlaces.map((place) => ({
        id: place.placeId,
        coordinate: {
            latitude: place.location.latitude,
            longitude: place.location.longitude,
        },
        title: place.name,
        description: place.formattedAddress,
        category: mapGoogleTypeToCategory(place.types),
    }));

    // Fetch nearby places when location or category changes
    const fetchNearbyPlaces = useCallback(
        async (location: UserLocation, category: PlaceCategory | 'all') => {
            setIsLoadingPlaces(true);
            try {
                const includedTypes =
                    category === 'all' ? undefined : CATEGORY_TO_GOOGLE_TYPES[category];

                // Skip if category has no types (like 'home')
                if (includedTypes && includedTypes.length === 0) {
                    setPlaces([]);
                    setIsLoadingPlaces(false);
                    return;
                }

                const results = await searchNearby({
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                    },
                    radius: MAP_CONFIG.DEFAULT_RADIUS,
                    includedTypes,
                    maxResultCount: MAP_CONFIG.MAX_NEARBY_RESULTS,
                });

                setPlaces(results);

                // Auto-select first place if none selected
                if (results.length > 0 && !selectedPlace) {
                    const firstPlace = convertNearbyPlaceToPlace(results[0]);
                    setSelectedPlace(firstPlace);
                }
            } catch (error) {
                console.error('Error fetching nearby places:', error);
            } finally {
                setIsLoadingPlaces(false);
            }
        },
        [selectedPlace]
    );

    // Effect to fetch places when location/category changes
    useEffect(() => {
        if (userLocation) {
            fetchNearbyPlaces(userLocation, activeCategory);
        }
    }, [userLocation, activeCategory, fetchNearbyPlaces]);

    // Get current location
    const getCurrentLocation = useCallback(async () => {
        setIsLoadingLocation(true);
        try {
            const location = await ExpoLocation.getCurrentPositionAsync({
                accuracy: ExpoLocation.Accuracy.Balanced,
            });

            const newLocation: UserLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy ?? undefined,
                timestamp: location.timestamp,
            };

            setUserLocation(newLocation);

            // Center map on user location
            mapRef.current?.animateToCoordinate({
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
            });
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert(
                'Lỗi',
                'Không thể lấy vị trí hiện tại. Vui lòng kiểm tra cài đặt GPS.'
            );
        } finally {
            setIsLoadingLocation(false);
        }
    }, [setIsLoadingLocation, setUserLocation]);

    // Request location permission on mount
    useEffect(() => {
        const requestPermission = async () => {
            try {
                const { status } =
                    await ExpoLocation.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    getCurrentLocation();
                } else {
                    Alert.alert(
                        'Cần quyền vị trí',
                        'Vui lòng cho phép truy cập vị trí để sử dụng đầy đủ tính năng bản đồ'
                    );
                }
            } catch (error) {
                console.error('Error requesting location permission:', error);
            }
        };

        requestPermission();
    }, [getCurrentLocation]);

    // Handle search query change
    const handleSearchChange = useCallback(
        (text: string) => {
            setSearchQuery(text);
        },
        [setSearchQuery]
    );

    // Handle place selection from autocomplete
    const handlePlaceSelectFromAutocomplete = useCallback(
        async (placeDetails: PlaceDetails) => {
            setSearchQuery(placeDetails.name);
            Keyboard.dismiss();

            const place = convertPlaceDetailsToPlace(placeDetails);
            setSelectedPlace(place);

            // Add to recently viewed
            setRecentlyViewed((prev) => {
                const filtered = prev.filter((p) => p.id !== place.id);
                return [place, ...filtered].slice(0, 10);
            });

            // Animate map to selected place
            mapRef.current?.animateToCoordinate({
                latitude: placeDetails.location.latitude,
                longitude: placeDetails.location.longitude,
            });
        },
        [setSearchQuery]
    );

    // Handle category change
    const handleCategoryPress = useCallback(
        (category: PlaceCategory | 'all') => {
            setActiveCategory(category);
            setSelectedPlace(null);
        },
        [setActiveCategory]
    );

    // Handle marker press on map
    const handleMarkerPress = useCallback(
        async (markerId: string) => {
            const nearbyPlace = places.find((p) => p.placeId === markerId);

            if (nearbyPlace) {
                try {
                    const details = await getPlaceDetails(markerId);
                    if (details) {
                        const place = convertPlaceDetailsToPlace(details);
                        setSelectedPlace(place);

                        // Add to recently viewed
                        setRecentlyViewed((prev) => {
                            const filtered = prev.filter((p) => p.id !== place.id);
                            return [place, ...filtered].slice(0, 10);
                        });
                    } else {
                        setSelectedPlace(convertNearbyPlaceToPlace(nearbyPlace));
                    }
                } catch {
                    setSelectedPlace(convertNearbyPlaceToPlace(nearbyPlace));
                }

                mapRef.current?.animateToCoordinate({
                    latitude: nearbyPlace.location.latitude,
                    longitude: nearbyPlace.location.longitude,
                });
            }
        },
        [places]
    );

    // Handle map press (deselect)
    const handleMapPress = useCallback(() => {
        Keyboard.dismiss();
    }, []);

    // Handle my location button
    const handleMyLocationPress = useCallback(() => {
        if (userLocation) {
            mapRef.current?.animateToCoordinate({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
            });
        } else {
            getCurrentLocation();
        }
    }, [userLocation, getCurrentLocation]);



    // Handle layers button - open map type modal
    const handleLayersPress = useCallback(() => {
        setShowMapTypeModal(true);
    }, []);

    // Handle map type selection
    const handleMapTypeSelect = useCallback((type: MapTypeOption) => {
        setMapType(type);
    }, []);

    // Handle place selection from bottom sheet
    const handlePlaceSelect = useCallback((place: Place) => {
        setSelectedPlace(place);
        mapRef.current?.animateToCoordinate({
            latitude: place.lat,
            longitude: place.lng,
        });
    }, []);

    // Handle get directions (Setup)
    const handleGetDirections = useCallback(
        async (place: Place) => {
            if (!userLocation) {
                Alert.alert(
                    'Lỗi',
                    'Vui lòng bật định vị để sử dụng tính năng chỉ đường'
                );
                return;
            }
            setSelectedPlace(place);
            setShowDirectionsSetup(true);
        },
        [userLocation]
    );

    // Handle Confirm Directions
    const handleConfirmDirections = useCallback(
        async ({ mode }: { origin: string; mode: TravelMode }) => {
            setShowDirectionsSetup(false);
            if (!selectedPlace || !userLocation) return;

            setIsLoadingRoute(true);
            setShowRouteOverlay(true);

            try {
                const route = await getDirections(
                    { latitude: userLocation.latitude, longitude: userLocation.longitude },
                    { latitude: selectedPlace.lat, longitude: selectedPlace.lng },
                    { mode }
                );
                setNavigationRoute(route);
            } catch (error) {
                console.error('Error getting directions:', error);
                Alert.alert('Lỗi', 'Không thể lấy chỉ đường. Vui lòng thử lại.');
                setShowRouteOverlay(false);
            } finally {
                setIsLoadingRoute(false);
            }
        },
        [selectedPlace, userLocation]
    );

    // Handle close route overlay
    const handleCloseRouteOverlay = useCallback(() => {
        setShowRouteOverlay(false);
        setNavigationRoute(null);
        setIsNavigating(false);
        setCurrentStepIndex(0);
    }, []);

    // Handle start navigation
    const handleStartNavigation = useCallback(() => {
        if (!navigationRoute) return;

        setIsNavigating(true);
        setShowRouteOverlay(false);
        setCurrentStepIndex(0);

        // Hide bottom sheet during navigation
        bottomSheetRef.current?.collapse();
    }, [navigationRoute]);

    // Handle exit navigation
    const handleExitNavigation = useCallback(() => {
        setIsNavigating(false);
        setNavigationRoute(null);
        setCurrentStepIndex(0);
    }, []);

    // Handle mic press
    const handleMicPress = useCallback(() => {
        Alert.alert('Tìm kiếm giọng nói', 'Tính năng đang phát triển');
    }, []);

    // Handle profile press
    const handleProfilePress = useCallback(() => {
        router.push('/(tabs)/profile' as any);
    }, [router]);

    // Handle bottom sheet close
    const handleBottomSheetClose = useCallback(() => {
        // Bottom sheet closed
    }, []);

    // Get current navigation step
    const currentStep = isNavigating
        ? navigationRoute?.steps[currentStepIndex] || null
        : null;

    return (
        <GestureHandlerRootView style={styles.container}>
            {/* Map Layer */}
            <MapAdapter
                ref={mapRef}
                markers={markers}
                selectedMarkerId={selectedPlace?.id || null}
                userLocation={userLocation}
                initialRegion={region}
                mapType={mapType}
                routePolyline={navigationRoute?.polylinePoints}
                showPolylineStroke
                hideBusinessPOI={isNavigating}
                showsTraffic={showsTraffic}
                onMarkerPress={handleMarkerPress}
                onMapPress={handleMapPress}
                showsUserLocation
                colorScheme={colorScheme}
            />

            {/* Offline Banner */}
            <OfflineBanner />

            {/* Navigation Banner (shown during navigation) */}
            {isNavigating && currentStep && (
                <NavigationBanner
                    currentStep={currentStep}
                    distanceToTurn={currentStep.distance}
                    remainingDistance={navigationRoute?.distance}
                    eta={navigationRoute?.duration}
                    colorScheme={colorScheme}
                    isNavigating={isNavigating}
                />
            )}

            {/* Search Overlay (hidden during navigation) */}
            {!isNavigating && !showDirectionsSetup && (
                <MapSearchOverlay
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryPress}
                    onPlaceSelect={handlePlaceSelectFromAutocomplete}
                    userLocation={userLocation}
                    onMicPress={handleMicPress}
                    onProfilePress={handleProfilePress}
                    colorScheme={colorScheme}
                />
            )}

            {/* Directions Setup Overlay */}
            {showDirectionsSetup && selectedPlace && (
                <View style={styles.fullScreenOverlay}>
                    <DirectionsSetup
                        destination={selectedPlace}
                        onStartNavigation={handleConfirmDirections}
                        onClose={() => setShowDirectionsSetup(false)}
                        colorScheme={colorScheme}
                    />
                </View>
            )}

            {/* Map Controls (Hidden during navigation to show Nav Buttons) */}
            {!isNavigating ? (
                <MapControls
                    onLayersPress={handleLayersPress}
                    onMyLocationPress={handleMyLocationPress}
                    isLoadingLocation={isLoadingLocation}
                    colorScheme={colorScheme}
                />
            ) : (
                <NavigationControls
                    onExit={handleExitNavigation}
                    onMyLocationPress={handleMyLocationPress}
                    isLoadingLocation={isLoadingLocation}
                    colorScheme={colorScheme}
                />
            )}

            {/* Place Bottom Sheet (hidden during navigation, route overlay and setup) */}
            {!isNavigating && !showRouteOverlay && !showDirectionsSetup && (
                <PlaceBottomSheet
                    ref={bottomSheetRef}
                    place={selectedPlace}
                    recentlyViewed={recentlyViewed}
                    onPlaceSelect={handlePlaceSelect}
                    onDirections={handleGetDirections}
                    onClose={handleBottomSheetClose}
                    colorScheme={colorScheme}
                />
            )}

            {/* Route Overlay */}
            {showRouteOverlay && (
                <RouteOverlay
                    route={navigationRoute}
                    isLoading={isLoadingRoute}
                    onStartNavigation={handleStartNavigation}
                    onClose={handleCloseRouteOverlay}
                    colorScheme={colorScheme}
                />
            )}

            {/* Map Type Selector Modal */}
            <MapTypeSelectorModal
                visible={showMapTypeModal}
                selectedType={mapType}
                onSelect={handleMapTypeSelect}
                onClose={() => setShowMapTypeModal(false)}
                colorScheme={colorScheme}
            />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fullScreenOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 50,
        backgroundColor: '#fff',
    },
});
