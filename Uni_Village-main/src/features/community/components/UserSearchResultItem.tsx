import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { UserSearchResult } from '@/features/chat/api';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface UserSearchResultItemProps {
    user: UserSearchResult;
    onPress: (userId: number, relationshipStatus: UserSearchResult['relationshipStatus']) => void;
}

export function UserSearchResultItem({ user, onPress }: UserSearchResultItemProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const getRelationshipBadge = () => {
        switch (user.relationshipStatus) {
            case 'ACCEPTED':
                return (
                    <View style={[styles.badge, { backgroundColor: colors.actionBlue + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.actionBlue }]}>
                            Bạn bè
                        </Text>
                    </View>
                );
            case 'PENDING_OUTGOING':
                return (
                    <View style={[styles.badge, { backgroundColor: colors.textSecondary + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                            Đã gửi
                        </Text>
                    </View>
                );
            case 'PENDING_INCOMING':
                return (
                    <View style={[styles.badge, { backgroundColor: colors.actionBlue + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.actionBlue }]}>
                            Yêu cầu
                        </Text>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                { backgroundColor: colors.background },
                pressed && { backgroundColor: colors.backgroundSecondary },
            ]}
            onPress={() => onPress(user.id, user.relationshipStatus)}
        >
            <View style={styles.avatar}>
                {user.avatarUrl ? (
                    <Image
                        source={{ uri: user.avatarUrl }}
                        style={styles.avatarImage}
                        contentFit="cover"
                        transition={200}
                        testID="user-avatar"
                    />
                ) : (
                    <View
                        style={[styles.avatarPlaceholder, { backgroundColor: colors.actionBlue }]}
                    >
                        <Text style={styles.avatarText}>
                            {user.displayName?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                    {user.displayName}
                </Text>
                <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                    @{user.username}
                </Text>
            </View>

            {getRelationshipBadge()}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        minHeight: 72,
    },
    avatar: {
        marginRight: Spacing.sm,
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    displayName: {
        fontSize: Typography.sizes.md,
        fontWeight: '600',
        marginBottom: 2,
    },
    username: {
        fontSize: Typography.sizes.sm,
    },
    badge: {
        paddingHorizontal: Spacing.xs,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: Spacing.xs,
    },
    badgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: '600',
    },
});
