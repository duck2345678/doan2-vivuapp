/**
 * SkeletonPlaceCard - Shimmer loading placeholder for place cards
 *
 * Uses react-native-reanimated for smooth shimmer animations.
 */

import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors } from '@/shared/constants/theme';
import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface SkeletonPlaceCardProps {
    colorScheme?: 'light' | 'dark';
}

/**
 * Shimmer overlay component for skeleton loading
 */
const ShimmerOverlay = memo(function ShimmerOverlay() {
    const translateX = useSharedValue(-200);

    useEffect(() => {
        translateX.value = withRepeat(
            withTiming(200, {
                duration: 1200,
                easing: Easing.linear,
            }),
            -1, // Infinite
            false
        );
    }, [translateX]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <Animated.View style={[styles.shimmer, animatedStyle]}>
            <View style={styles.shimmerGradient} />
        </Animated.View>
    );
});

/**
 * Skeleton placeholder for a single place card
 */
export const SkeletonPlaceCard = memo(function SkeletonPlaceCard({
    colorScheme = 'light',
}: SkeletonPlaceCardProps) {
    const colors = Colors[colorScheme];
    const baseColor = colorScheme === 'dark' ? '#2D2D2D' : '#E1E1E1';

    return (
        <View style={styles.container}>
            {/* Thumbnail skeleton */}
            <View
                style={[
                    styles.thumbnail,
                    { backgroundColor: baseColor },
                ]}
            >
                <ShimmerOverlay />
            </View>

            {/* Info skeleton */}
            <View style={styles.infoContainer}>
                {/* Title skeleton */}
                <View
                    style={[
                        styles.titleSkeleton,
                        { backgroundColor: baseColor },
                    ]}
                >
                    <ShimmerOverlay />
                </View>

                {/* Meta row skeleton */}
                <View style={styles.metaRow}>
                    <View
                        style={[
                            styles.ratingSkeleton,
                            { backgroundColor: baseColor },
                        ]}
                    >
                        <ShimmerOverlay />
                    </View>
                    <View
                        style={[
                            styles.distanceSkeleton,
                            { backgroundColor: baseColor },
                        ]}
                    >
                        <ShimmerOverlay />
                    </View>
                </View>

                {/* Address skeleton */}
                <View
                    style={[
                        styles.addressSkeleton,
                        { backgroundColor: baseColor },
                    ]}
                >
                    <ShimmerOverlay />
                </View>
            </View>

            {/* Button skeleton */}
            <View
                style={[
                    styles.buttonSkeleton,
                    { backgroundColor: baseColor },
                ]}
            >
                <ShimmerOverlay />
            </View>
        </View>
    );
});

/**
 * Multiple skeleton cards for loading state
 */
export const SkeletonPlaceList = memo(function SkeletonPlaceList({
    count = 3,
    colorScheme = 'light',
}: {
    count?: number;
    colorScheme?: 'light' | 'dark';
}) {
    return (
        <View style={styles.listContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonPlaceCard key={index} colorScheme={colorScheme} />
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    listContainer: {
        gap: Spacing.sm,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.sm,
        gap: Spacing.md,
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    infoContainer: {
        flex: 1,
        gap: Spacing.xs,
    },
    titleSkeleton: {
        width: '70%',
        height: 18,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    metaRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    ratingSkeleton: {
        width: 60,
        height: 14,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    distanceSkeleton: {
        width: 50,
        height: 14,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    addressSkeleton: {
        width: '90%',
        height: 14,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    buttonSkeleton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    shimmer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    shimmerGradient: {
        width: 100,
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: [{ skewX: '-20deg' }],
    },
});
