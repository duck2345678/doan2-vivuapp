/**
 * SelectedItineraryCard Component
 * Displays the selected itinerary preview after user picks one
 */

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ItineraryForSelection } from '../types/createPost.types';

interface SelectedItineraryCardProps {
    itinerary: ItineraryForSelection;
    onChangeItinerary: () => void;
}

export function SelectedItineraryCard({
    itinerary,
    onChangeItinerary,
}: SelectedItineraryCardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const previewStops = itinerary.stops.slice(0, 2);
    const remainingStops = itinerary.stops.length - 2;

    const handleCopy = async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        // Copy itinerary title or a shareable link
        await Clipboard.setStringAsync(itinerary.title);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Tags */}
            <View style={styles.tagsRow}>
                {itinerary.tags.map((tag, index) => (
                    <View
                        key={index}
                        style={[styles.tag, { backgroundColor: colors.chipBackground }]}
                    >
                        <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                            {tag}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
                {itinerary.title}
            </Text>

            {/* Meta row */}
            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <MaterialIcons name="event" size={14} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {itinerary.date}
                    </Text>
                </View>
                <Text style={[styles.metaDot, { color: colors.textSecondary }]}>•</Text>
                <View style={styles.metaItem}>
                    <MaterialIcons name="schedule" size={14} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {itinerary.timeRange}
                    </Text>
                </View>
            </View>

            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <MaterialIcons name="place" size={14} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {itinerary.area}
                    </Text>
                </View>
                <Text style={[styles.metaDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {itinerary.stopsCount} điểm dừng
                </Text>
            </View>

            {/* Stops preview */}
            <View style={styles.stopsContainer}>
                {previewStops.map((stop, index) => (
                    <View key={stop.id} style={styles.stopRow}>
                        <View
                            style={[
                                styles.stopDot,
                                { backgroundColor: colors.actionBlue },
                            ]}
                        />
                        <Text style={[styles.stopTime, { color: colors.textSecondary }]}>
                            {stop.time}
                        </Text>
                        <Text
                            style={[styles.stopName, { color: colors.textPrimary }]}
                            numberOfLines={1}
                        >
                            {stop.name}
                        </Text>
                    </View>
                ))}
                {remainingStops > 0 && (
                    <TouchableOpacity style={styles.viewMoreRow}>
                        <Text style={[styles.viewMoreText, { color: colors.actionBlue }]}>
                            Xem chi tiết (+{remainingStops})
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.chipBackground }]}
                    onPress={onChangeItinerary}
                >
                    <MaterialIcons name="swap-horiz" size={18} color={colors.actionBlue} />
                    <Text style={[styles.actionText, { color: colors.actionBlue }]}>
                        Đổi lịch trình
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colors.chipBackground }]}
                    onPress={handleCopy}
                >
                    <MaterialIcons name="content-copy" size={18} color={colors.actionBlue} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    tag: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    tagText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
    title: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        marginBottom: Spacing.sm,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: Typography.sizes.sm,
    },
    metaDot: {
        fontSize: Typography.sizes.sm,
    },
    stopsContainer: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
        paddingLeft: Spacing.xs,
    },
    stopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    stopDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    stopTime: {
        fontSize: Typography.sizes.sm,
        width: 44,
    },
    stopName: {
        fontSize: Typography.sizes.sm,
        flex: 1,
    },
    viewMoreRow: {
        paddingLeft: 20,
    },
    viewMoreText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm + 4,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        gap: Spacing.xs,
    },
    actionText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
