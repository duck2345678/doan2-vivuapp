/**
 * ChannelInviteCard Component
 * Displays a channel invite card with gradient icon and CTA button
 */

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { ChannelInvite } from '@/shared/types';

interface ChannelInviteCardProps {
    invite: ChannelInvite;
    onJoinPress?: () => void;
}

/**
 * Channel invite card component matching Figma design
 * Features: gradient icon tile, member count, gradient CTA button
 */
export function ChannelInviteCard({ invite, onJoinPress }: ChannelInviteCardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const router = useRouter();

    const handlePress = () => {
        if (onJoinPress) {
            onJoinPress();
        } else {
            // Navigate to channel info screen
            router.push({
                pathname: '/channel/[channelId]/info',
                params: { channelId: invite.channelId },
            } as any);
        }
    };

    const handleCardPress = () => {
        router.push({
            pathname: '/channel/[channelId]/info',
            params: { channelId: invite.channelId },
        } as any);
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                },
            ]}
            onPress={handleCardPress}
            activeOpacity={0.9}
        >
            {/* Top row: Icon + Channel info */}
            <View style={styles.topRow}>
                {/* Gradient icon tile */}
                <LinearGradient
                    colors={['#a855f7', '#6366f1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconTile}
                >
                    <MaterialIcons name="groups" size={28} color="#ffffff" />
                </LinearGradient>

                {/* Channel info */}
                <View style={styles.channelInfo}>
                    <Text style={[styles.channelName, { color: colors.textPrimary }]}>
                        {invite.emoji ? `${invite.emoji} ` : ''}
                        {invite.name}
                    </Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                        {invite.description}
                    </Text>
                    {/* Member count */}
                    <View style={styles.memberRow}>
                        <MaterialIcons name="groups" size={16} color="#a855f7" />
                        <Text style={[styles.memberCount, { color: '#a855f7' }]}>
                            {invite.memberCount.toLocaleString()} thành viên
                        </Text>
                    </View>
                </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
                <LinearGradient
                    colors={['#ec4899', '#f97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaButton}
                >
                    <MaterialIcons name="group-add" size={20} color="#ffffff" />
                    <Text style={styles.ctaText}>Tham gia ngay</Text>
                </LinearGradient>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: BorderRadius.xl, // 16px
        borderWidth: 1,
        marginHorizontal: Spacing.cardPadding,
        marginTop: Spacing.md,
        padding: Spacing.cardPadding,
        ...Shadows.sm,
    },
    topRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: Spacing.md,
    },
    iconTile: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.lg, // 12px
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    channelName: {
        fontSize: Typography.sizes.base, // 16px
        fontWeight: Typography.weights.semibold,
        lineHeight: 22,
        marginBottom: 2,
    },
    description: {
        fontSize: Typography.sizes.md, // 14px
        fontWeight: Typography.weights.normal,
        lineHeight: 20,
        marginBottom: 4,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberCount: {
        fontSize: Typography.sizes.md, // 14px
        fontWeight: Typography.weights.medium,
        lineHeight: 20,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: BorderRadius.pill, // 24px
    },
    ctaText: {
        color: '#ffffff',
        fontSize: Typography.sizes.base, // 16px
        fontWeight: Typography.weights.semibold,
    },
});
