/**
 * SelectedChannelCard Component
 * Displays the selected channel info after user picks one
 */

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ChannelForSelection } from '../types/createPost.types';

interface SelectedChannelCardProps {
    channel: ChannelForSelection;
    onChangeChannel: () => void;
}

export function SelectedChannelCard({
    channel,
    onChangeChannel,
}: SelectedChannelCardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const router = useRouter();

    const handleViewChannel = () => {
        router.push(`/channel/${channel.id}` as any);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Chips row */}
            <View style={styles.chipsRow}>
                <View style={[styles.chip, { backgroundColor: colors.chipBackground }]}>
                    <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                        # Channel
                    </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.chipBackground }]}>
                    <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                        {channel.visibility === 'public' ? 'Công khai' : 'Riêng tư'}
                    </Text>
                </View>
            </View>

            {/* Channel name and icon */}
            <View style={styles.channelHeader}>
                <View
                    style={[
                        styles.channelIcon,
                        { backgroundColor: colors.chipBackground },
                    ]}
                >
                    <Text style={styles.channelEmoji}>{channel.emoji || '#'}</Text>
                </View>
                <Text style={[styles.channelName, { color: colors.textPrimary }]}>
                    {channel.name}
                </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                    {channel.memberCount.toLocaleString()} thành viên
                </Text>
                <Text style={[styles.statsDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                    {channel.postsPerWeek} bài/tuần
                </Text>
            </View>

            {/* Guidelines */}
            {channel.guidelines && (
                <Text
                    style={[styles.guidelines, { color: colors.textSecondary }]}
                    numberOfLines={2}
                >
                    {channel.guidelines}
                </Text>
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.chipBackground }]}
                    onPress={onChangeChannel}
                >
                    <MaterialIcons name="swap-horiz" size={18} color={colors.actionBlue} />
                    <Text style={[styles.actionText, { color: colors.actionBlue }]}>
                        Đổi Channel
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.chipBackground }]}
                    onPress={handleViewChannel}
                >
                    <MaterialIcons name="visibility" size={18} color={colors.actionBlue} />
                    <Text style={[styles.actionText, { color: colors.actionBlue }]}>
                        Xem Channel
                    </Text>
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
    chipsRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    chip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    chipText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
    channelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    channelIcon: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelEmoji: {
        fontSize: 18,
    },
    channelName: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    statsText: {
        fontSize: Typography.sizes.sm,
    },
    statsDot: {
        fontSize: Typography.sizes.sm,
    },
    guidelines: {
        fontSize: Typography.sizes.sm,
        fontStyle: 'italic',
        marginBottom: Spacing.md,
        lineHeight: 18,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
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
});
