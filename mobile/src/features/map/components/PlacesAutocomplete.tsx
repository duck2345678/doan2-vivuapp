/**
 * Places Autocomplete Component
 * 
 * Shows a dropdown of place suggestions as the user types.
 * Uses Google Places API (New) for autocomplete.
 */

import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors, Shadows } from '@/shared/constants/theme';
import { Typography } from '@/shared/constants/typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    autocomplete,
    getPlaceDetails,
    PlaceDetails,
    PlacePrediction,
} from '../services/placesService';
import { LocationCache } from '../utils/LocationCache';
import { calculateDistance, formatDistance } from '../utils/placeConverters';

// Extended prediction with distance info
interface PredictionWithDistance extends PlacePrediction {
    distanceKm?: number;
    isLoadingDistance?: boolean;
}

interface PlacesAutocompleteProps {
    /** Search query string */
    query: string;
    /** Whether the autocomplete dropdown is visible */
    isVisible: boolean;
    /** Callback when a place is selected */
    onPlaceSelect: (place: PlaceDetails) => void;
    /** Callback to close the autocomplete */
    onClose: () => void;
    /** User's current location for biasing results */
    userLocation?: { latitude: number; longitude: number };
    /** Color scheme */
    colorScheme?: 'light' | 'dark';
    /** Custom placeholder for empty state */
    emptyPlaceholder?: string;
}

// Cache for place locations to avoid repeated API calls
const locationCache = new LocationCache(100);

export const PlacesAutocomplete = memo(function PlacesAutocomplete({
    query,
    isVisible,
    onPlaceSelect,
    onClose,
    userLocation,
    colorScheme = 'light',
    emptyPlaceholder = 'Nhập tối thiểu 2 ký tự để tìm kiếm',
}: PlacesAutocompleteProps) {
    const [predictions, setPredictions] = useState<PredictionWithDistance[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const colors = Colors[colorScheme];

    // Fetch distance for predictions
    const fetchDistances = useCallback(async (preds: PlacePrediction[]) => {
        if (!userLocation || preds.length === 0) return;

        // Cancel any ongoing distance fetches
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Fetch locations in parallel for predictions that don't have cached locations
        const fetchPromises = preds.map(async (pred) => {
            // Check cache first
            if (locationCache.has(pred.placeId)) {
                const cached = locationCache.get(pred.placeId)!;
                const distanceKm = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    cached.lat,
                    cached.lng
                );
                return { placeId: pred.placeId, distanceKm };
            }

            try {
                const details = await getPlaceDetails(pred.placeId);
                if (details) {
                    // Cache the location
                    locationCache.set(pred.placeId, {
                        lat: details.location.latitude,
                        lng: details.location.longitude,
                    });

                    const distanceKm = calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        details.location.latitude,
                        details.location.longitude
                    );
                    return { placeId: pred.placeId, distanceKm };
                }
            } catch (error) {
                // Silently fail for individual distance calculations
            }
            return { placeId: pred.placeId, distanceKm: undefined };
        });

        try {
            const results = await Promise.all(fetchPromises);

            // Update predictions with distances
            setPredictions(current =>
                current.map(pred => {
                    const result = results.find(r => r.placeId === pred.placeId);
                    return {
                        ...pred,
                        distanceKm: result?.distanceKm,
                        isLoadingDistance: false,
                    };
                })
            );
        } catch (error) {
            // If aborted, just ignore
        }
    }, [userLocation]);

    // Debounced autocomplete search
    useEffect(() => {
        if (!isVisible) {
            setPredictions([]);
            return;
        }

        if (debounceRef.current !== null) {
            clearTimeout(debounceRef.current);
        }

        if (query.length < 2) {
            setPredictions([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        debounceRef.current = setTimeout(async () => {
            try {
                const results = await autocomplete(query, {
                    location: userLocation,
                    countries: ['vn'],
                    limit: 5,
                });

                // Set predictions with loading state for distance
                const predictionsWithLoading: PredictionWithDistance[] = results.map(r => ({
                    ...r,
                    isLoadingDistance: !!userLocation,
                }));
                setPredictions(predictionsWithLoading);

                // Fetch distances in background
                if (userLocation) {
                    fetchDistances(results);
                }
            } catch (error) {
                console.error('Autocomplete error:', error);
                setPredictions([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, isVisible, userLocation, fetchDistances]);

    const handleSelectPrediction = useCallback(
        async (prediction: PlacePrediction) => {
            Keyboard.dismiss();
            setIsLoadingDetails(true);

            try {
                const details = await getPlaceDetails(prediction.placeId);
                if (details) {
                    onPlaceSelect(details);
                    onClose();
                }
            } catch (error) {
                console.error('Get place details error:', error);
            } finally {
                setIsLoadingDetails(false);
            }
        },
        [onPlaceSelect, onClose]
    );

    const renderPredictionItem = useCallback(
        ({ item, index }: { item: PredictionWithDistance; index: number }) => (
            <TouchableOpacity
                style={[
                    styles.predictionItem,
                    index === 0 && styles.predictionItemFirst,
                    index === predictions.length - 1 && styles.predictionItemLast,
                ]}
                onPress={() => handleSelectPrediction(item)}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={`${item.mainText}, ${item.secondaryText}${item.distanceKm ? `, ${formatDistance(item.distanceKm)}` : ''}`}
            >
                <View style={[styles.predictionIcon, { backgroundColor: `${colors.tint}15` }]}>
                    <MaterialIcons
                        name="location-on"
                        size={18}
                        color={colors.tint}
                    />
                </View>
                <View style={styles.predictionContent}>
                    <View style={styles.predictionHeader}>
                        <Text
                            style={[styles.predictionMainText, { color: colors.text }]}
                            numberOfLines={1}
                        >
                            {item.mainText}
                        </Text>
                        {/* Distance badge */}
                        {item.isLoadingDistance ? (
                            <ActivityIndicator size={10} color={colors.icon} style={styles.distanceLoader} />
                        ) : item.distanceKm !== undefined ? (
                            <View style={[styles.distanceBadge, { backgroundColor: `${colors.tint}15` }]}>
                                <Text style={[styles.distanceText, { color: colors.tint }]}>
                                    {formatDistance(item.distanceKm)}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <Text
                        style={[styles.predictionSecondaryText, { color: colors.icon }]}
                        numberOfLines={1}
                    >
                        {item.secondaryText}
                    </Text>
                </View>
                <View style={styles.arrowContainer}>
                    <MaterialIcons
                        name="north-west"
                        size={14}
                        color={colors.icon}
                    />
                </View>
            </TouchableOpacity>
        ),
        [colors, handleSelectPrediction, predictions.length]
    );

    const keyExtractor = useCallback(
        (item: PlacePrediction) => item.placeId,
        []
    );

    const ItemSeparatorComponent = useCallback(
        () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
        [colors.border]
    );

    if (!isVisible) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            {/* Loading overlay for getting place details */}
            {isLoadingDetails && (
                <View style={[styles.loadingOverlay, { backgroundColor: colors.card }]}>
                    <ActivityIndicator size="small" color={colors.tint} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>
                        Đang tải chi tiết...
                    </Text>
                </View>
            )}

            {/* Search loading indicator */}
            {isLoading && (
                <View style={styles.searchingRow}>
                    <ActivityIndicator size="small" color={colors.tint} />
                    <Text style={[styles.searchingText, { color: colors.icon }]}>
                        Đang tìm kiếm...
                    </Text>
                </View>
            )}

            {/* No results or waiting for input */}
            {!isLoading && predictions.length === 0 && (
                <View style={styles.emptyState}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.tint}10` }]}>
                        <MaterialIcons
                            name={query.length < 2 ? 'search' : 'location-off'}
                            size={24}
                            color={colors.tint}
                        />
                    </View>
                    <Text style={[styles.emptyText, { color: colors.icon }]}>
                        {query.length < 2 ? emptyPlaceholder : 'Không tìm thấy kết quả'}
                    </Text>
                    {query.length >= 2 && (
                        <Text style={[styles.emptyHint, { color: colors.icon }]}>
                            Thử nhập từ khóa khác hoặc địa chỉ cụ thể hơn
                        </Text>
                    )}
                </View>
            )}

            {/* Predictions list */}
            {!isLoading && predictions.length > 0 && (
                <FlatList
                    data={predictions}
                    renderItem={renderPredictionItem}
                    keyExtractor={keyExtractor}
                    ItemSeparatorComponent={ItemSeparatorComponent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Powered by Google */}
            <View style={[styles.poweredBy, { borderTopColor: colors.border }]}>
                <Text style={[styles.poweredByText, { color: colors.icon }]}>
                    Powered by Google
                </Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginTop: Spacing.xs,
        borderRadius: BorderRadius.lg,
        maxHeight: 320,
        ...Shadows.card,
        overflow: 'hidden',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    loadingText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium as any,
    },
    searchingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    searchingText: {
        fontSize: Typography.sizes.sm,
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    emptyIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    emptyText: {
        fontSize: Typography.sizes.sm,
        textAlign: 'center',
        fontWeight: Typography.weights.medium as any,
    },
    emptyHint: {
        fontSize: Typography.sizes.xs,
        textAlign: 'center',
        opacity: 0.7,
    },
    listContent: {
        paddingVertical: Spacing.sm,
    },
    predictionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        marginHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    predictionItemFirst: {
        marginTop: 0,
    },
    predictionItemLast: {
        marginBottom: 0,
    },
    predictionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    predictionContent: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    predictionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    predictionMainText: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.medium as any,
        flex: 1,
    },
    distanceLoader: {
        marginLeft: Spacing.xs,
    },
    distanceBadge: {
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        marginLeft: Spacing.xs,
    },
    distanceText: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.medium as any,
    },
    predictionSecondaryText: {
        fontSize: Typography.sizes.sm,
        lineHeight: Typography.sizes.sm * 1.3,
    },
    arrowContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: Spacing.md,
        marginLeft: Spacing.md + 36 + Spacing.md, // Align with text content
    },
    poweredBy: {
        padding: Spacing.sm,
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    poweredByText: {
        fontSize: Typography.sizes.xs,
    },
});

