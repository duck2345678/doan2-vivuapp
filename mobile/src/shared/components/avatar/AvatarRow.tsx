/**
 * AvatarRow Component
 * Horizontal overlapping avatar stack with overflow count
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/shared/components/ui';
import { BorderRadius, Colors, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { ChannelMember } from '@/shared/types';

interface AvatarRowProps {
    members: ChannelMember[];
    totalCount: number;
    visibleCount?: number;
    avatarSize?: number;
    overlap?: number;
}

/**
 * Displays a row of overlapping avatars with +N overflow indicator
 */
export function AvatarRow({
    members,
    totalCount,
    visibleCount = 5,
    avatarSize = 36,
    overlap = 10,
}: AvatarRowProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const visibleMembers = members.slice(0, visibleCount);
    const overflowCount = totalCount - visibleCount;

    return (
        <View style={styles.container}>
            {visibleMembers.map((member, index) => (
                <View
                    key={member.id}
                    style={[
                        styles.avatarWrapper,
                        {
                            marginLeft: index === 0 ? 0 : -overlap,
                            zIndex: visibleCount - index,
                        },
                    ]}
                >
                    <Avatar
                        source={member.avatarUrl}
                        name={member.displayName}
                        size="sm"
                        style={[
                            styles.avatar,
                            {
                                width: avatarSize,
                                height: avatarSize,
                                borderRadius: avatarSize / 2,
                                borderColor: colors.card,
                            },
                        ]}
                    />
                </View>
            ))}

            {overflowCount > 0 && (
                <View
                    style={[
                        styles.overflowBubble,
                        {
                            width: avatarSize,
                            height: avatarSize,
                            borderRadius: avatarSize / 2,
                            marginLeft: -overlap,
                            backgroundColor: colors.muted,
                            borderColor: colors.card,
                        },
                    ]}
                >
                    <Text style={[styles.overflowText, { color: colors.textSecondary }]}>
                        +{overflowCount > 999 ? '999' : overflowCount}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        borderRadius: BorderRadius.full,
    },
    avatar: {
        borderWidth: 2,
    },
    overflowBubble: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    overflowText: {
        fontSize: Typography.sizes.sm, // 12px
        fontWeight: Typography.weights.medium,
    },
});
