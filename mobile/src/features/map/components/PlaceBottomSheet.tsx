/**
 * PlaceBottomSheet - Gorhom Bottom Sheet for Place Details
 *
 * Features:
 * - 3 snap points (collapsed, half, full)
 * - 60fps gesture-driven animations
 * - Place details with actions
 * - Recently viewed list
 * - Safe area handling
 * - Google Maps-style UX: header + quick actions visible immediately
 */

import { Spacing } from "@/shared/constants/spacing";
import { BorderRadius, Colors, MapColors, Shadows } from "@/shared/constants/theme";
import { Typography } from "@/shared/constants/typography";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import React, {
    forwardRef,
    memo,
    useCallback,
    useImperativeHandle,
    useMemo,
    useRef,
} from "react";
import {
    Dimensions,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Place } from "../types";
import { PhotoCarousel } from "./PhotoCarousel";
import { SkeletonPlaceCard } from "./SkeletonPlaceCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface PlaceBottomSheetProps {
    /** Currently selected place */
    place: Place | null;
    /** List of recently viewed places */
    recentlyViewed?: Place[];
    /** Whether place data is loading */
    isLoading?: boolean;
    /** Callback when a place is selected */
    onPlaceSelect?: (place: Place) => void;
    /** Callback when directions button is pressed */
    onDirections?: (place: Place) => void;
    /** Callback when view details is pressed */
    onViewDetails?: (place: Place) => void;
    /** Callback when sheet is closed */
    onClose?: () => void;
    /** Callback when sheet index changes */
    onSheetChange?: (index: number) => void;
    /** Color scheme */
    colorScheme?: "light" | "dark";
}

export interface PlaceBottomSheetRef {
    /** Expand sheet to full height */
    expand: () => void;
    /** Collapse sheet to minimum height */
    collapse: () => void;
    /** Close sheet completely */
    close: () => void;
    /** Snap to specific index */
    snapToIndex: (index: number) => void;
}

/** Place Header Component - Shows name, rating, category, close button */
const PlaceHeader = memo(function PlaceHeader({
    place,
    onClose,
    onShare,
    onBookmark,
    colorScheme = "light",
}: {
    place: Place;
    onClose?: () => void;
    onShare?: () => void;
    onBookmark?: () => void;
    colorScheme?: "light" | "dark";
}) {
    const colors = Colors[colorScheme];

    // Get category label
    const categoryLabel = useMemo(() => {
        const categoryMap: Record<string, string> = {
            restaurant: "Nhà hàng",
            cafe: "Quán cà phê",
            hotel: "Khách sạn",
            hospital: "Bệnh viện",
            school: "Trường học",
            shopping: "Mua sắm",
            entertainment: "Giải trí",
            other: "Địa điểm",
        };
        return categoryMap[place.category] || "Địa điểm";
    }, [place.category]);

    return (
        <View style={styles.placeHeader}>
            {/* Main content */}
            <View style={styles.placeHeaderContent}>
                {/* Place name */}
                <Text
                    style={[styles.placeHeaderName, { color: colors.text }]}
                    numberOfLines={2}
                >
                    {place.name}
                </Text>

                {/* Meta row: rating, reviews, distance, category */}
                <View style={styles.placeHeaderMeta}>
                    {/* Rating */}
                    <View style={styles.ratingBadge}>
                        <Text style={[styles.ratingValue, { color: colors.text }]}>
                            {place.rating.toFixed(1)}
                        </Text>
                        <MaterialIcons name="star" size={12} color="#FBBF24" />
                        {place.ratingCount && (
                            <Text style={[styles.ratingCount, { color: colors.icon }]}>
                                ({place.ratingCount})
                            </Text>
                        )}
                    </View>

                    {/* Separator */}
                    <Text style={[styles.metaSeparator, { color: colors.icon }]}>•</Text>

                    {/* Distance */}
                    {place.distanceKm > 0 && (
                        <>
                            <View style={styles.distanceBadge}>
                                <MaterialIcons name="directions-car" size={12} color={colors.icon} />
                                <Text style={[styles.distanceValue, { color: colors.icon }]}>
                                    {place.distanceKm < 1
                                        ? `${Math.round(place.distanceKm * 1000)} m`
                                        : `${place.distanceKm.toFixed(1)} km`}
                                </Text>
                            </View>
                            <Text style={[styles.metaSeparator, { color: colors.icon }]}>•</Text>
                        </>
                    )}

                    {/* Category */}
                    <Text style={[styles.categoryLabel, { color: colors.icon }]}>
                        {categoryLabel}
                    </Text>
                </View>
            </View>

            {/* Action buttons */}
            <View style={styles.placeHeaderActions}>
                <TouchableOpacity
                    style={styles.headerIconButton}
                    onPress={onBookmark}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialIcons name="bookmark-outline" size={22} color={colors.icon} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.headerIconButton}
                    onPress={onShare}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialIcons name="share" size={22} color={colors.icon} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.headerIconButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialIcons name="close" size={22} color={colors.icon} />
                </TouchableOpacity>
            </View>
        </View>
    );
});

/** Quick Actions Component - Directions, Start, Call, Save buttons */
const QuickActions = memo(function QuickActions({
    place,
    onDirections,
    onStart,
    onCall,
    onSave,
    colorScheme = "light",
}: {
    place: Place;
    onDirections?: () => void;
    onStart?: () => void;
    onCall?: () => void;
    onSave?: () => void;
    colorScheme?: "light" | "dark";
}) {
    const colors = Colors[colorScheme];
    const hasPhone = !!place.phone;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContainer}
        >
            {/* Directions - Primary action */}
            <TouchableOpacity
                style={[styles.quickActionButton, styles.quickActionPrimary]}
                onPress={onDirections}
                activeOpacity={0.8}
            >
                <MaterialIcons name="directions" size={18} color="#fff" />
                <Text style={styles.quickActionPrimaryText}>Chỉ đường</Text>
            </TouchableOpacity>

            {/* Start navigation */}
            <TouchableOpacity
                style={[styles.quickActionButton, styles.quickActionSecondary, { borderColor: colors.border }]}
                onPress={onStart || onDirections}
                activeOpacity={0.7}
            >
                <MaterialIcons name="navigation" size={18} color={colors.text} />
                <Text style={[styles.quickActionSecondaryText, { color: colors.text }]}>
                    Bắt đầu
                </Text>
            </TouchableOpacity>

            {/* Call - only if phone available */}
            {hasPhone && (
                <TouchableOpacity
                    style={[styles.quickActionButton, styles.quickActionSecondary, { borderColor: colors.border }]}
                    onPress={onCall}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="call" size={18} color={colors.text} />
                    <Text style={[styles.quickActionSecondaryText, { color: colors.text }]}>
                        Gọi
                    </Text>
                </TouchableOpacity>
            )}

            {/* Save */}
            <TouchableOpacity
                style={[styles.quickActionButton, styles.quickActionSecondary, { borderColor: colors.border }]}
                onPress={onSave}
                activeOpacity={0.7}
            >
                <MaterialIcons name="bookmark-outline" size={18} color={colors.text} />
            </TouchableOpacity>
        </ScrollView>
    );
});

/** Recently Viewed Section */
const RecentlyViewedSection = memo(function RecentlyViewedSection({
    places,
    onPlaceSelect,
    colorScheme = "light",
}: {
    places: Place[];
    onPlaceSelect?: (place: Place) => void;
    colorScheme?: "light" | "dark";
}) {
    const colors = Colors[colorScheme];

    if (!places || places.length === 0) {
        return null;
    }

    return (
        <View style={styles.recentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Đã xem gần đây
            </Text>
            <View style={styles.recentList}>
                {places.slice(0, 5).map((place) => (
                    <TouchableOpacity
                        key={place.id}
                        style={[styles.recentItem, { backgroundColor: colors.muted }]}
                        onPress={() => onPlaceSelect?.(place)}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={{ uri: place.thumbnail }}
                            style={styles.recentThumbnail}
                            resizeMode="cover"
                        />
                        <Text
                            style={[styles.recentName, { color: colors.text }]}
                            numberOfLines={1}
                        >
                            {place.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
});

export const PlaceBottomSheet = forwardRef<
    PlaceBottomSheetRef,
    PlaceBottomSheetProps
>(function PlaceBottomSheet(
    {
        place,
        recentlyViewed = [],
        isLoading = false,
        onPlaceSelect,
        onDirections,
        onViewDetails,
        onClose,
        onSheetChange,
        colorScheme = "light",
    },
    ref
) {
    const router = useRouter();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const insets = useSafeAreaInsets();
    const colors = Colors[colorScheme];
    const mapColors = MapColors[colorScheme];

    // Snap points: collapsed (show header + actions), half screen, full screen
    const snapPoints = useMemo(() => {
        const collapsed = 220; // Increased to show header + quick actions
        const half = SCREEN_HEIGHT * 0.45;
        const full = SCREEN_HEIGHT * 0.85;
        return [collapsed, half, full];
    }, []);

    // Expose methods
    useImperativeHandle(ref, () => ({
        expand: () => bottomSheetRef.current?.expand(),
        collapse: () => bottomSheetRef.current?.snapToIndex(0),
        close: () => bottomSheetRef.current?.close(),
        snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
    }));

    // Handle sheet changes
    const handleSheetChange = useCallback(
        (index: number) => {
            onSheetChange?.(index);
            if (index === -1) {
                onClose?.();
            }
        },
        [onSheetChange, onClose]
    );

    // Render backdrop
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={0}
                appearsOnIndex={1}
                opacity={0.5}
            />
        ),
        []
    );

    // Handle directions press
    const handleDirectionsPress = useCallback(() => {
        if (place && onDirections) {
            onDirections(place);
        }
    }, [place, onDirections]);

    // Handle view details - navigate to PlaceDetailsScreen
    const handleViewDetails = useCallback(() => {
        if (place) {
            if (onViewDetails) {
                onViewDetails(place);
            } else {
                // Default: navigate to PlaceDetailsScreen
                router.push({
                    pathname: "/place-details" as any,
                    params: { placeData: JSON.stringify(place) },
                });
            }
        }
    }, [place, onViewDetails, router]);

    // Handle close
    const handleClose = useCallback(() => {
        bottomSheetRef.current?.close();
        onClose?.();
    }, [onClose]);

    // Handle call
    const handleCall = useCallback(() => {
        if (place?.phone) {
            Linking.openURL(`tel:${place.phone}`);
        }
    }, [place]);

    // Handle share
    const handleShare = useCallback(() => {
        // TODO: Implement share functionality
        console.log("Share:", place?.name);
    }, [place]);

    // Handle bookmark
    const handleBookmark = useCallback(() => {
        // TODO: Implement bookmark functionality
        console.log("Bookmark:", place?.name);
    }, [place]);

    // Don't render if no place
    if (!place && recentlyViewed.length === 0) {
        return null;
    }

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            onChange={handleSheetChange}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={[
                styles.handleIndicator,
                { backgroundColor: mapColors.bottomSheetHandle },
            ]}
            backgroundStyle={[
                styles.sheetBackground,
                { backgroundColor: mapColors.bottomSheetBackground },
            ]}
            enablePanDownToClose={false}
            style={styles.sheet}
        >
            {/* Main Content */}
            <BottomSheetScrollView
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: insets.bottom + Spacing.md },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <SkeletonPlaceCard colorScheme={colorScheme} />
                ) : place ? (
                    <>
                        {/* Place Header - Always visible */}
                        <PlaceHeader
                            place={place}
                            onClose={handleClose}
                            onShare={handleShare}
                            onBookmark={handleBookmark}
                            colorScheme={colorScheme}
                        />

                        {/* Quick Actions - Always visible */}
                        <QuickActions
                            place={place}
                            onDirections={handleDirectionsPress}
                            onCall={handleCall}
                            onSave={handleBookmark}
                            colorScheme={colorScheme}
                        />

                        {/* Photo Carousel - Below fold */}
                        {place.photos && place.photos.length > 0 && (
                            <View style={styles.photosSection}>
                                <PhotoCarousel
                                    photos={place.photos}
                                    onPhotoPress={handleViewDetails}
                                    onViewAllPress={handleViewDetails}
                                    colorScheme={colorScheme}
                                />
                            </View>
                        )}

                        {/* Address */}
                        {place.address && (
                            <TouchableOpacity
                                style={styles.addressRow}
                                onPress={handleViewDetails}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="location-on" size={20} color={colors.icon} />
                                <Text
                                    style={[styles.addressText, { color: colors.text }]}
                                    numberOfLines={2}
                                >
                                    {place.address}
                                </Text>
                                <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
                            </TouchableOpacity>
                        )}

                        {/* Opening Hours */}
                        {place.isOpen !== undefined && (
                            <View style={styles.infoRow}>
                                <MaterialIcons name="schedule" size={20} color={colors.icon} />
                                <View style={styles.openStatusContainer}>
                                    <Text
                                        style={[
                                            styles.openStatusText,
                                            { color: place.isOpen ? "#22C55E" : "#EF4444" },
                                        ]}
                                    >
                                        {place.isOpen ? "Đang mở cửa" : "Đã đóng cửa"}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </>
                ) : null}

                {/* Recently Viewed Section */}
                <RecentlyViewedSection
                    places={recentlyViewed}
                    onPlaceSelect={onPlaceSelect}
                    colorScheme={colorScheme}
                />
            </BottomSheetScrollView>
        </BottomSheet>
    );
});

const styles = StyleSheet.create({
    sheet: {
        ...Shadows.xl,
    },
    sheetBackground: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
    },
    handleIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    contentContainer: {
        paddingHorizontal: Spacing.md,
    },
    // Place Header styles
    placeHeader: {
        flexDirection: "row",
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    placeHeaderContent: {
        flex: 1,
        gap: Spacing.xs,
    },
    placeHeaderName: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold as any,
        lineHeight: Typography.sizes.xl * 1.2,
    },
    placeHeaderMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        flexWrap: "wrap",
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    ratingValue: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium as any,
    },
    ratingCount: {
        fontSize: Typography.sizes.sm,
    },
    metaSeparator: {
        fontSize: Typography.sizes.sm,
    },
    distanceBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    distanceValue: {
        fontSize: Typography.sizes.sm,
    },
    categoryLabel: {
        fontSize: Typography.sizes.sm,
    },
    placeHeaderActions: {
        flexDirection: "row",
        gap: Spacing.xs,
    },
    headerIconButton: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    // Quick Actions styles
    quickActionsContainer: {
        flexDirection: "row",
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    quickActionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.pill,
    },
    quickActionPrimary: {
        backgroundColor: "#4285F4",
    },
    quickActionPrimaryText: {
        color: "#fff",
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold as any,
    },
    quickActionSecondary: {
        borderWidth: 1,
        backgroundColor: "transparent",
    },
    quickActionSecondaryText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium as any,
    },
    // Photos section
    photosSection: {
        marginTop: Spacing.sm,
    },
    // Address row
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    addressText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        lineHeight: Typography.sizes.sm * 1.4,
    },
    // Info row
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    openStatusContainer: {
        flex: 1,
    },
    openStatusText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium as any,
    },
    // Recently viewed section
    recentSection: {
        marginTop: Spacing.lg,
        gap: Spacing.sm,
    },
    sectionTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold as any,
    },
    recentList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
    },
    recentItem: {
        alignItems: "center",
        padding: Spacing.sm,
        borderRadius: BorderRadius.lg,
        gap: Spacing.xs,
        width: 100,
    },
    recentThumbnail: {
        width: 60,
        height: 60,
        borderRadius: BorderRadius.md,
    },
    recentName: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.medium as any,
        textAlign: "center",
    },
});
