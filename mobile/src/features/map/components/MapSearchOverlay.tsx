/**
 * MapSearchOverlay - Search and Category Filter Overlay
 *
 * Extracted from MapScreen for better component separation.
 * Contains search bar, autocomplete, category chips, and sort controls.
 */

import { Spacing } from '@/shared/constants/spacing';
import React, { memo, useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlaceDetails } from '../services/placesService';
import type { PlaceCategory, UserLocation } from '../types';
import { CategoryChips } from './CategoryChips';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { SearchBar } from './SearchBar';


interface MapSearchOverlayProps {
    /** Current search query */
    searchQuery: string;
    /** Callback when search query changes */
    onSearchChange: (query: string) => void;
    /** Active category filter */
    activeCategory: PlaceCategory | 'all';
    /** Callback when category is selected */
    onCategoryChange: (category: PlaceCategory | 'all') => void;

    /** Callback when place is selected from autocomplete */
    onPlaceSelect: (placeDetails: PlaceDetails) => void;
    /** User location for biasing search results */
    userLocation?: UserLocation | null;
    /** Callback when mic button is pressed */
    onMicPress?: () => void;
    /** Callback when profile button is pressed */
    onProfilePress?: () => void;
    /** Color scheme */
    colorScheme?: 'light' | 'dark';
}

export const MapSearchOverlay = memo(function MapSearchOverlay({
    searchQuery,
    onSearchChange,
    activeCategory,
    onCategoryChange,
    onPlaceSelect,
    userLocation,
    onMicPress,
    onProfilePress,
    colorScheme = 'light',
}: MapSearchOverlayProps) {
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const handleSearchChange = useCallback(
        (text: string) => {
            onSearchChange(text);
            if (text.length >= 2) {
                setIsSearchFocused(true);
            }
        },
        [onSearchChange]
    );

    const handlePlaceSelect = useCallback(
        (placeDetails: PlaceDetails) => {
            setIsSearchFocused(false);
            Keyboard.dismiss();
            onPlaceSelect(placeDetails);
        },
        [onPlaceSelect]
    );

    const handleSearchFocus = useCallback(() => {
        setIsSearchFocused(true);
    }, []);

    const handleSearchBlur = useCallback(() => {
        // Delay to allow autocomplete item press
        setTimeout(() => setIsSearchFocused(false), 200);
    }, []);

    const handleAutocompleteClose = useCallback(() => {
        setIsSearchFocused(false);
    }, []);

    return (
        <SafeAreaView
            style={styles.overlay}
            edges={['top']}
            pointerEvents="box-none"
        >
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    onMicPress={onMicPress}
                    onClear={handleAutocompleteClose}
                    onProfilePress={onProfilePress}
                    colorScheme={colorScheme}
                />

                {/* Autocomplete Dropdown */}
                <PlacesAutocomplete
                    query={searchQuery}
                    isVisible={isSearchFocused && searchQuery.length >= 2}
                    onPlaceSelect={handlePlaceSelect}
                    onClose={handleAutocompleteClose}
                    userLocation={userLocation ?? undefined}
                    colorScheme={colorScheme}
                />
            </View>

            {/* Category Chips */}
            <View style={styles.chipsContainer}>
                <CategoryChips
                    activeCategory={activeCategory}
                    onCategoryPress={onCategoryChange}
                    colorScheme={colorScheme}
                />
            </View>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    searchContainer: {
        paddingHorizontal: Spacing.screenPadding,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
        position: 'relative',
        zIndex: 20,
    },
    chipsContainer: {
        zIndex: 10,
    },
});
