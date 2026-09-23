/**
 * Location Picker Component
 * 
 * Allows users to select a location by:
 * 1. Searching using Google Places autocomplete
 * 2. Dragging a pin on the map
 * Uses reverse geocoding to display the address of the selected location.
 */

import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors, Shadows } from '@/shared/constants/theme';
import { Typography } from '@/shared/constants/typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserLocation } from '../hooks/useUserLocation';
import { getReadableAddress } from '../services/geocodingService';
import { PlaceDetails } from '../services/placesService';
import type { MapRegion } from '../types';
import { MapAdapter, MapAdapterRef } from './MapAdapter';
import { PlacesAutocomplete } from './PlacesAutocomplete';

interface SelectedLocation {
    latitude: number;
    longitude: number;
    address: string;
}

interface LocationPickerProps {
    /** Initial location to center the map */
    initialLocation?: { latitude: number; longitude: number };
    /** Callback when location is confirmed */
    onLocationSelect: (location: SelectedLocation) => void;
    /** Callback to cancel selection */
    onCancel: () => void;
    /** Color scheme */
    colorScheme?: 'light' | 'dark';
}

export const LocationPicker = memo(function LocationPicker({
    initialLocation,
    onLocationSelect,
    onCancel,
    colorScheme = 'light',
}: LocationPickerProps) {
    const mapRef = useRef<MapAdapterRef>(null);
    const insets = useSafeAreaInsets();
    const [selectedLocation, setSelectedLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(initialLocation || null);
    const [address, setAddress] = useState<string>('');
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Use the existing location hook for "Get My Location" functionality
    const {
        location: userLocation,
        isLoading: isLoadingUserLocation,
        refresh: refreshUserLocation,
    } = useUserLocation({ enableWatch: false });

    const colors = Colors[colorScheme];

    // Default region (Ho Chi Minh City)
    const defaultRegion: MapRegion = {
        latitude: initialLocation?.latitude || 10.7626,
        longitude: initialLocation?.longitude || 106.6824,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    // Fetch address when location changes
    useEffect(() => {
        if (!selectedLocation) return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        setIsLoadingAddress(true);

        debounceRef.current = setTimeout(async () => {
            try {
                const addr = await getReadableAddress(
                    selectedLocation.latitude,
                    selectedLocation.longitude
                );
                setAddress(addr);
            } catch (error) {
                console.error('Get address error:', error);
                setAddress('Không xác định được địa chỉ');
            } finally {
                setIsLoadingAddress(false);
            }
        }, 500);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [selectedLocation]);

    const handleRegionChange = useCallback((region: MapRegion) => {
        setSelectedLocation({
            latitude: region.latitude,
            longitude: region.longitude,
        });
    }, []);

    const handlePlaceSelect = useCallback((place: PlaceDetails) => {
        const newLocation = {
            latitude: place.location.latitude,
            longitude: place.location.longitude,
        };
        setSelectedLocation(newLocation);
        setAddress(place.formattedAddress);
        setSearchQuery('');
        setIsSearchFocused(false);
        Keyboard.dismiss();

        // Animate map to selected place
        mapRef.current?.animateToCoordinate(newLocation);
    }, []);

    const handleCloseAutocomplete = useCallback(() => {
        setIsSearchFocused(false);
        Keyboard.dismiss();
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    const handleConfirm = useCallback(() => {
        if (selectedLocation && address) {
            onLocationSelect({
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                address,
            });
        }
    }, [selectedLocation, address, onLocationSelect]);

    // Handle "Get My Location" button press
    const handleGetMyLocation = useCallback(async () => {
        await refreshUserLocation();
    }, [refreshUserLocation]);

    // Animate to user location when it updates
    useEffect(() => {
        if (userLocation && isLoadingUserLocation === false) {
            const newLocation = {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
            };
            setSelectedLocation(newLocation);
            mapRef.current?.animateToCoordinate(newLocation);
        }
    }, [userLocation, isLoadingUserLocation]);

    return (
        <View style={styles.container}>
            {/* Map - Wrapped with TouchableWithoutFeedback to dismiss keyboard */}
            <TouchableWithoutFeedback 
                onPress={() => {
                    if (isSearchFocused) {
                        Keyboard.dismiss();
                        setIsSearchFocused(false);
                    }
                }}
            >
                <View style={styles.mapContainer}>
                    <MapAdapter
                        ref={mapRef}
                        initialRegion={defaultRegion}
                        onRegionChange={handleRegionChange}
                        markers={[]}
                        showsUserLocation
                        colorScheme={colorScheme}
                    />

                    {/* Center Pin (fixed position) */}
                    <View style={styles.centerPinContainer} pointerEvents="none">
                        <MaterialIcons
                            name="location-on"
                            size={48}
                            color={colors.tint}
                            style={styles.centerPin}
                        />
                        <View style={[styles.pinShadow, { backgroundColor: colors.text }]} />
                    </View>
                </View>
            </TouchableWithoutFeedback>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { paddingTop: insets.top + Spacing.sm }]}>
                <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        onPress={onCancel}
                        style={styles.backButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={colors.icon} />
                    </TouchableOpacity>
                    <View style={styles.searchInputContainer}>
                        <MaterialIcons name="search" size={20} color={colors.icon} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Tìm kiếm địa điểm..."
                            placeholderTextColor={colors.icon}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            returnKeyType="search"
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={handleClearSearch}>
                                <MaterialIcons name="close" size={20} color={colors.icon} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Places Autocomplete Dropdown */}
                <PlacesAutocomplete
                    query={searchQuery}
                    isVisible={isSearchFocused && searchQuery.length >= 2}
                    onPlaceSelect={handlePlaceSelect}
                    onClose={handleCloseAutocomplete}
                    userLocation={selectedLocation || undefined}
                    colorScheme={colorScheme}
                    emptyPlaceholder="Nhập địa điểm để tìm kiếm"
                />
            </View>

            {/* My Location FAB */}
            <TouchableOpacity
                style={[
                    styles.myLocationButton,
                    { backgroundColor: colors.card },
                ]}
                onPress={handleGetMyLocation}
                activeOpacity={0.7}
                disabled={isLoadingUserLocation}
            >
                {isLoadingUserLocation ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                    <MaterialIcons name="my-location" size={24} color={colors.tint} />
                )}
            </TouchableOpacity>

            {/* Bottom Panel */}
            <View style={[styles.bottomPanel, { backgroundColor: colors.card }]}>
                {/* Header */}
                <View style={styles.panelHeader}>
                    <Text style={[styles.panelTitle, { color: colors.text }]}>
                        Chọn vị trí
                    </Text>
                </View>

                {/* Selected address */}
                <View style={styles.addressSection}>
                    <View style={styles.addressIconContainer}>
                        <MaterialIcons
                            name="location-on"
                            size={24}
                            color={colors.tint}
                        />
                    </View>
                    <View style={styles.addressContent}>
                        {isLoadingAddress ? (
                            <View style={styles.loadingAddress}>
                                <ActivityIndicator size="small" color={colors.icon} />
                                <Text style={[styles.loadingText, { color: colors.icon }]}>
                                    Đang lấy địa chỉ...
                                </Text>
                            </View>
                        ) : (
                            <Text
                                style={[styles.addressText, { color: colors.text }]}
                                numberOfLines={2}
                            >
                                {address || 'Di chuyển bản đồ để chọn vị trí'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Coordinates (optional, for debugging) */}
                {selectedLocation && (
                    <Text style={[styles.coordsText, { color: colors.icon }]}>
                        {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                    </Text>
                )}

                {/* Confirm button */}
                <TouchableOpacity
                    style={[
                        styles.confirmButton,
                        { backgroundColor: colors.tint },
                        (!selectedLocation || !address || isLoadingAddress) && styles.confirmButtonDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={!selectedLocation || !address || isLoadingAddress}
                    activeOpacity={0.8}
                >
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Xác nhận vị trí</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mapContainer: {
        flex: 1,
    },
    centerPinContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -24,
        marginTop: -48,
        alignItems: 'center',
    },
    centerPin: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    myLocationButton: {
        position: 'absolute',
        right: Spacing.screenPadding,
        bottom: 220,
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.card,
    },
    pinShadow: {
        width: 8,
        height: 8,
        borderRadius: 4,
        opacity: 0.3,
        marginTop: -8,
    },
    searchContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: Spacing.screenPadding,
        zIndex: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.sm,
        height: 48,
        ...Shadows.card,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.sizes.base,
        paddingVertical: Platform.OS === 'ios' ? Spacing.sm : 0,
    },
    bottomPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.screenPadding,
        ...Shadows.card,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    panelTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold as any,
    },
    addressSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    addressIconContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addressContent: {
        flex: 1,
        justifyContent: 'center',
        minHeight: 40,
    },
    loadingAddress: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    loadingText: {
        fontSize: Typography.sizes.sm,
    },
    addressText: {
        fontSize: Typography.sizes.base,
        lineHeight: Typography.sizes.base * 1.4,
    },
    coordsText: {
        fontSize: Typography.sizes.xs,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    confirmButtonText: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold as any,
        color: '#fff',
    },
});
