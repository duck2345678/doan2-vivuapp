/**
 * MessageRequestsEntryRow Component
 * Entry point row for message requests, displayed at top of Chat List
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import { useMessageRequestCount } from '../store';

/**
 * Entry row shown when message requests exist
 * Navigates to /chat/message-requests on press
 */
export function MessageRequestsEntryRow() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const router = useRouter();

    const requestCount = useMessageRequestCount();

    // Hide when no requests
    if (requestCount === 0) {
        return null;
    }

    const handlePress = () => {
        router.push('/chat/message-requests');
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                { backgroundColor: colors.card },
                pressed && styles.pressed,
            ]}
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={`${requestCount} tin nhắn đang chờ`}
        >
            <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
                <Ionicons name="chatbubble-ellipses" size={20} color={colors.tint} />
            </View>

            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    Tin nhắn đang chờ
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {requestCount} yêu cầu mới
                </Text>
            </View>

            <View style={[styles.badge, { backgroundColor: colors.tint }]}>
                <Text style={styles.badgeText}>{requestCount}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.sm,
        borderRadius: 12,
    },
    pressed: {
        opacity: 0.7,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    title: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        lineHeight: 22,
    },
    subtitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.normal,
        lineHeight: 18,
        marginTop: 2,
    },
    badge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        marginRight: Spacing.sm,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
