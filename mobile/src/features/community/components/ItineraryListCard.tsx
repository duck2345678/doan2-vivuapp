import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Itinerary, ItineraryStatus } from '@/features/itinerary/types/itinerary.types';
import { getItineraryCoverImage, getItineraryDestinationsCount } from '@/features/itinerary/types/itinerary.types';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface ItineraryListCardProps {
    itinerary: Itinerary;
    onPress?: (itinerary: Itinerary) => void;
}

const badgeConfig: Record<ItineraryStatus, { label: string; bg: string; text: string }> = {
    ongoing: { label: 'Đang diễn ra', bg: '#DCFCE7', text: '#16A34A' },
    upcoming: { label: 'Sắp tới', bg: '#DBEAFE', text: '#2563EB' },
    past: { label: 'Đã kết thúc', bg: '#F3F4F6', text: '#6B7280' },
};

function StatusBadge({ status }: { status: ItineraryStatus }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const config = badgeConfig[status];

    return (
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
        </View>
    );
}

/**
 * Compact itinerary card for list display
 * Shows cover image, title, date, stops count, and status badge
 */
export function ItineraryListCard({ itinerary, onPress }: ItineraryListCardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const coverImage = getItineraryCoverImage(itinerary);
    const stopsCount = getItineraryDestinationsCount(itinerary);

    return (
        <TouchableOpacity
            testID={`itinerary-card-${itinerary.id}`}
            style={[styles.container, { backgroundColor: colors.card }, Shadows.sm]}
            onPress={() => onPress?.(itinerary)}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: coverImage }}
                style={styles.coverImage}
                contentFit="cover"
                transition={200}
            />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                        {itinerary.title}
                    </Text>
                    <StatusBadge status={itinerary.status} />
                </View>
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {itinerary.startDate}
                        </Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {stopsCount} điểm
                        </Text>
                    </View>
                </View>
                {itinerary.note && (
                    <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={1}>
                        {itinerary.note}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginHorizontal: Spacing.screenPadding,
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    coverImage: {
        width: 80,
        height: 80,
    },
    content: {
        flex: 1,
        padding: Spacing.sm,
        justifyContent: 'center',
        gap: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    title: {
        flex: 1,
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        lineHeight: 22,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    badgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.medium,
    },
    metaRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: Typography.sizes.sm,
        lineHeight: 18,
    },
    note: {
        fontSize: Typography.sizes.sm,
        fontStyle: 'italic',
    },
});
