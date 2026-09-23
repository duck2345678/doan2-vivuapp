/**
 * PlaceDetailsScreen - Full details screen with photo grid gallery
 * 
 * Features:
 * - Photo grid gallery (3-column layout)
 * - Full place information
 * - Action buttons (Directions, Call, Website, Share)
 * - Opening hours
 * - Editorial summary
 */

import { Spacing } from "@/shared/constants/spacing";
import { BorderRadius, Colors } from "@/shared/constants/theme";
import { Typography } from "@/shared/constants/typography";
import { useColorScheme } from "@/shared/hooks/useColorScheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
    Dimensions,
    Image,
    Linking,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getPhotoUrl } from "../services/placesService";
import type { Place, PlacePhoto } from "../types";
import { ReviewsList } from "./ReviewsList";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_SPACING = 4;
const GRID_COLUMNS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - GRID_SPACING * (GRID_COLUMNS + 1)) / GRID_COLUMNS;

interface PlaceDetailsScreenProps {
    place?: Place;
}

// Price level display helper
function getPriceLevelText(priceLevel?: 1 | 2 | 3 | 4): string {
    if (!priceLevel) return "";
    return "$".repeat(priceLevel);
}

// Action Button Component
const ActionButton = ({
    icon,
    label,
    onPress,
    color,
    colorScheme = "light",
}: {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    onPress: () => void;
    color?: string;
    colorScheme?: "light" | "dark";
}) => {
    const colors = Colors[colorScheme];
    return (
        <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.muted }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <MaterialIcons name={icon} size={22} color={color || colors.tint} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
        </TouchableOpacity>
    );
};

// Photo Grid Item
const PhotoGridItem = ({
    photo,
    index,
    onPress,
}: {
    photo: PlacePhoto;
    index: number;
    onPress?: () => void;
}) => {
    const photoUrl = getPhotoUrl(photo.name, 400);

    return (
        <TouchableOpacity
            style={styles.gridItem}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <Image
                source={{ uri: photoUrl }}
                style={styles.gridPhoto}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );
};

// Info Row Component
const InfoRow = ({
    icon,
    text,
    colorScheme = "light",
    onPress,
}: {
    icon: keyof typeof MaterialIcons.glyphMap;
    text: string;
    colorScheme?: "light" | "dark";
    onPress?: () => void;
}) => {
    const colors = Colors[colorScheme];
    const content = (
        <View style={styles.infoRow}>
            <MaterialIcons name={icon} size={20} color={colors.icon} />
            <Text
                style={[
                    styles.infoText,
                    { color: onPress ? colors.tint : colors.text }
                ]}
                numberOfLines={2}
            >
                {text}
            </Text>
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {content}
            </TouchableOpacity>
        );
    }
    return content;
};

export function PlaceDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? "light";
    const colors = Colors[colorScheme];
    const params = useLocalSearchParams<{ placeData?: string }>();

    // Parse place data from params
    const place: Place | null = useMemo(() => {
        if (params.placeData) {
            try {
                return JSON.parse(params.placeData);
            } catch {
                return null;
            }
        }
        return null;
    }, [params.placeData]);

    // Handle back navigation
    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    // Handle directions
    const handleDirections = useCallback(() => {
        if (!place) return;
        // Navigate back to map with directions mode
        router.back();
        // Note: In a real app, you'd trigger directions from map state
    }, [place, router]);

    // Handle call
    const handleCall = useCallback(() => {
        if (place?.phone) {
            Linking.openURL(`tel:${place.phone}`);
        } else if (place?.internationalPhone) {
            Linking.openURL(`tel:${place.internationalPhone}`);
        }
    }, [place]);

    // Handle website
    const handleWebsite = useCallback(() => {
        if (place?.website) {
            Linking.openURL(place.website);
        }
    }, [place]);

    // Handle share
    const handleShare = useCallback(async () => {
        if (!place) return;
        try {
            const deepLinkUrl = `univillage://place-details?placeId=${place.id}`;
            const message = `${place.name}\n${place.address || ""}`;

            if (Platform.OS === "ios") {
                await Share.share({
                    url: deepLinkUrl,
                });
            } else {
                await Share.share({
                    title: place.name,
                    message: `${message}\n\nXem chi tiết tại: ${deepLinkUrl}`,
                });
            }
        } catch (error) {
            console.error("Share error:", error);
        }
    }, [place]);

    if (!place) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.icon }]}>
                        Không tìm thấy thông tin địa điểm
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const photos = place.photos || [];
    const hasPhotos = photos.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Image / Photo Grid Header */}
                {hasPhotos ? (
                    <View style={styles.photoGridHeader}>
                        <Image
                            source={{ uri: getPhotoUrl(photos[0].name, 1200) }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                        {/* Back button overlay */}
                        <SafeAreaView style={styles.headerOverlay} edges={["top"]}>
                            <TouchableOpacity
                                onPress={handleBack}
                                style={styles.backButtonOverlay}
                            >
                                <MaterialIcons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                        </SafeAreaView>
                    </View>
                ) : (
                    <SafeAreaView
                        style={[styles.noPhotoHeader, { backgroundColor: colors.muted }]}
                        edges={["top"]}
                    >
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </SafeAreaView>
                )}

                {/* Place Info Section */}
                <View style={styles.infoSection}>
                    {/* Name and Rating */}
                    <View style={styles.titleRow}>
                        <Text style={[styles.placeName, { color: colors.text }]}>
                            {place.name}
                        </Text>
                        {place.priceLevel && (
                            <Text style={[styles.priceLevel, { color: colors.icon }]}>
                                {getPriceLevelText(place.priceLevel)}
                            </Text>
                        )}
                    </View>

                    {/* Rating Row */}
                    <View style={styles.ratingRow}>
                        <MaterialIcons name="star" size={18} color="#FBBF24" />
                        <Text style={[styles.ratingText, { color: colors.text }]}>
                            {place.rating?.toFixed(1) || "N/A"}
                        </Text>
                        {place.ratingCount && (
                            <Text style={[styles.ratingCount, { color: colors.icon }]}>
                                ({place.ratingCount} đánh giá)
                            </Text>
                        )}
                        {/* Status */}
                        {place.isOpen !== undefined && (
                            <View style={styles.statusBadge}>
                                <View
                                    style={[
                                        styles.statusDot,
                                        { backgroundColor: place.isOpen ? "#22C55E" : "#EF4444" },
                                    ]}
                                />
                                <Text
                                    style={[
                                        styles.statusText,
                                        { color: place.isOpen ? "#22C55E" : "#EF4444" },
                                    ]}
                                >
                                    {place.isOpen ? "Đang mở cửa" : "Đã đóng cửa"}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Business Status */}
                    {place.businessStatus && place.businessStatus !== 'OPERATIONAL' && (
                        <View style={[styles.warningBadge, { backgroundColor: "#FEF3C7" }]}>
                            <MaterialIcons name="warning" size={16} color="#D97706" />
                            <Text style={styles.warningText}>
                                {place.businessStatus === 'CLOSED_TEMPORARILY'
                                    ? "Tạm thời đóng cửa"
                                    : "Đã ngừng hoạt động"}
                            </Text>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        <ActionButton
                            icon="directions"
                            label="Chỉ đường"
                            onPress={handleDirections}
                            colorScheme={colorScheme}
                        />
                        {(place.phone || place.internationalPhone) && (
                            <ActionButton
                                icon="phone"
                                label="Gọi điện"
                                onPress={handleCall}
                                colorScheme={colorScheme}
                            />
                        )}
                        {place.website && (
                            <ActionButton
                                icon="language"
                                label="Website"
                                onPress={handleWebsite}
                                colorScheme={colorScheme}
                            />
                        )}
                        <ActionButton
                            icon="share"
                            label="Chia sẻ"
                            onPress={handleShare}
                            colorScheme={colorScheme}
                        />
                    </View>

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: colors.muted }]} />

                    {/* Info Details */}
                    <View style={styles.detailsSection}>
                        {/* Address */}
                        {place.address && (
                            <InfoRow
                                icon="location-on"
                                text={place.address}
                                colorScheme={colorScheme}
                            />
                        )}

                        {/* Phone */}
                        {(place.phone || place.internationalPhone) && (
                            <InfoRow
                                icon="phone"
                                text={place.internationalPhone || place.phone || ""}
                                colorScheme={colorScheme}
                                onPress={handleCall}
                            />
                        )}

                        {/* Website */}
                        {place.website && (
                            <InfoRow
                                icon="language"
                                text={place.website}
                                colorScheme={colorScheme}
                                onPress={handleWebsite}
                            />
                        )}

                        {/* Opening Hours */}
                        {place.openingHoursText && place.openingHoursText.length > 0 && (
                            <View style={styles.hoursSection}>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="schedule" size={20} color={colors.icon} />
                                    <Text style={[styles.hoursTitle, { color: colors.text }]}>
                                        Giờ mở cửa
                                    </Text>
                                </View>
                                {place.openingHoursText.map((hours, index) => (
                                    <Text
                                        key={index}
                                        style={[styles.hoursText, { color: colors.icon }]}
                                    >
                                        {hours}
                                    </Text>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Editorial Summary */}
                    {place.editorialSummary && (
                        <>
                            <View style={[styles.divider, { backgroundColor: colors.muted }]} />
                            <View style={styles.summarySection}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    Giới thiệu
                                </Text>
                                <Text style={[styles.summaryText, { color: colors.icon }]}>
                                    {place.editorialSummary}
                                </Text>
                            </View>
                        </>
                    )}

                    {/* Photo Grid */}
                    {hasPhotos && photos.length > 1 && (
                        <>
                            <View style={[styles.divider, { backgroundColor: colors.muted }]} />
                            <View style={styles.photosSection}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    Ảnh ({photos.length})
                                </Text>
                                <View style={styles.photoGrid}>
                                    {photos.map((photo, index) => (
                                        <PhotoGridItem
                                            key={`${photo.name}-${index}`}
                                            photo={photo}
                                            index={index}
                                        />
                                    ))}
                                </View>
                            </View>
                        </>
                    )}

                    {/* Reviews Section */}
                    {place.reviews && place.reviews.length > 0 && (
                        <>
                            <View style={[styles.divider, { backgroundColor: colors.muted }]} />
                            <ReviewsList reviews={place.reviews} colorScheme={colorScheme} />
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    backButton: {
        padding: Spacing.xs,
    },
    backButtonOverlay: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center",
        justifyContent: "center",
    },
    photoGridHeader: {
        position: "relative",
    },
    heroImage: {
        width: SCREEN_WIDTH,
        height: 280,
    },
    headerOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    noPhotoHeader: {
        height: 100,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        fontSize: Typography.sizes.md,
    },
    infoSection: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: Spacing.xs,
    },
    placeName: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold as any,
        flex: 1,
    },
    priceLevel: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium as any,
        marginLeft: Spacing.sm,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: Spacing.sm,
        flexWrap: "wrap",
        gap: 4,
    },
    ratingText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold as any,
        marginLeft: 4,
    },
    ratingCount: {
        fontSize: Typography.sizes.sm,
        marginLeft: 4,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: Spacing.md,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    statusText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium as any,
    },
    warningBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.md,
        gap: 6,
        marginBottom: Spacing.sm,
        alignSelf: "flex-start",
    },
    warningText: {
        fontSize: Typography.sizes.sm,
        color: "#D97706",
        fontWeight: Typography.weights.medium as any,
    },
    actionsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
    },
    actionButton: {
        flexDirection: "column",
        alignItems: "center",
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        minWidth: 70,
    },
    actionLabel: {
        fontSize: Typography.sizes.xs,
        marginTop: 4,
        fontWeight: Typography.weights.medium as any,
    },
    divider: {
        height: 1,
        marginVertical: Spacing.md,
    },
    detailsSection: {
        gap: Spacing.md,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.sm,
    },
    infoText: {
        fontSize: Typography.sizes.md,
        flex: 1,
        lineHeight: 22,
    },
    hoursSection: {
        gap: 4,
    },
    hoursTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium as any,
    },
    hoursText: {
        fontSize: Typography.sizes.sm,
        marginLeft: 28,
        lineHeight: 20,
    },
    summarySection: {
        gap: Spacing.sm,
    },
    sectionTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold as any,
    },
    summaryText: {
        fontSize: Typography.sizes.md,
        lineHeight: 24,
    },
    photosSection: {
        gap: Spacing.sm,
    },
    photoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: GRID_SPACING,
    },
    gridItem: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        borderRadius: BorderRadius.sm,
        overflow: "hidden",
    },
    gridPhoto: {
        width: "100%",
        height: "100%",
    },
});

export default PlaceDetailsScreen;
