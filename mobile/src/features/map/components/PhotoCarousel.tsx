/**
 * PhotoCarousel - Horizontal photo carousel for Place Bottom Sheet
 * 
 * Features:
 * - 5 photos max from Google Places API
 * - Lazy loading images
 * - Tap to navigate to full details
 * - Smooth horizontal scrolling
 */

import { BorderRadius, Colors, Shadows } from "@/shared/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getPhotoUrl } from "../services/placesService";
import type { PlacePhoto } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_WIDTH = SCREEN_WIDTH * 0.7;
const PHOTO_HEIGHT = 160;
const MAX_PHOTOS = 5;

interface PhotoCarouselProps {
    photos: PlacePhoto[];
    onPhotoPress?: () => void;
    onViewAllPress?: () => void;
    colorScheme?: "light" | "dark";
}

const PhotoItem = memo(function PhotoItem({
    photo,
    index,
    totalCount,
    onPress,
    colorScheme = "light",
}: {
    photo: PlacePhoto;
    index: number;
    totalCount: number;
    onPress?: () => void;
    colorScheme?: "light" | "dark";
}) {
    const photoUrl = getPhotoUrl(photo.name, 800);
    const isLast = index === totalCount - 1;

    return (
        <TouchableOpacity
            style={[styles.photoContainer, index === 0 && styles.firstPhoto]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <Image
                source={{ uri: photoUrl }}
                style={styles.photo}
                resizeMode="cover"
            />
            {/* Gradient overlay */}
            <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.4)"]}
                style={styles.gradient}
            />
            {/* Photo counter on last item */}
            {isLast && totalCount > 0 && (
                <View style={styles.counterContainer}>
                    <Text style={styles.counterText}>
                        {index + 1}/{totalCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

export const PhotoCarousel = memo(function PhotoCarousel({
    photos,
    onPhotoPress,
    onViewAllPress,
    colorScheme = "light",
}: PhotoCarouselProps) {
    const colors = Colors[colorScheme];
    const displayPhotos = photos.slice(0, MAX_PHOTOS);

    const handlePhotoPress = useCallback(() => {
        onPhotoPress?.();
    }, [onPhotoPress]);

    const renderPhoto = useCallback(
        ({ item, index }: { item: PlacePhoto; index: number }) => (
            <PhotoItem
                photo={item}
                index={index}
                totalCount={displayPhotos.length}
                onPress={handlePhotoPress}
                colorScheme={colorScheme}
            />
        ),
        [displayPhotos.length, handlePhotoPress, colorScheme]
    );

    const keyExtractor = useCallback((item: PlacePhoto, index: number) => {
        return `${item.name}-${index}`;
    }, []);

    if (!photos || photos.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: colors.muted }]}>
                <Text style={[styles.emptyText, { color: colors.icon }]}>
                    Chưa có ảnh
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={displayPhotos}
                renderItem={renderPhoto}
                keyExtractor={keyExtractor}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={PHOTO_WIDTH + 12}
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
            />
            {/* View all button */}
            {photos.length > 1 && (
                <TouchableOpacity
                    style={[styles.viewAllButton, { backgroundColor: colors.background }]}
                    onPress={onViewAllPress || onPhotoPress}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.viewAllText, { color: colors.tint }]}>
                        Xem tất cả ({photos.length})
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    listContent: {
        paddingHorizontal: 16,
    },
    photoContainer: {
        width: PHOTO_WIDTH,
        height: PHOTO_HEIGHT,
        borderRadius: BorderRadius.lg,
        overflow: "hidden",
        marginRight: 12,
        ...Shadows.md,
    },
    firstPhoto: {
        marginLeft: 0,
    },
    photo: {
        width: "100%",
        height: "100%",
    },
    gradient: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 60,
    },
    counterContainer: {
        position: "absolute",
        bottom: 8,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    counterText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    emptyContainer: {
        height: PHOTO_HEIGHT,
        marginHorizontal: 16,
        borderRadius: BorderRadius.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        fontSize: 14,
    },
    viewAllButton: {
        position: "absolute",
        bottom: 8,
        left: 24,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.md,
        ...Shadows.sm,
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: "600",
    },
});
