import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OnlineStatusBadgeProps {
    userId: number;
    size?: 'sm' | 'md' | 'lg';
    style?: any;
}

export function OnlineStatusBadge({ userId, size = 'sm', style }: OnlineStatusBadgeProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const { isOnline } = useOnlineStatus(userId);

    const sizeStyles = {
        sm: { width: 10, height: 10, borderWidth: 2 },
        md: { width: 14, height: 14, borderWidth: 2 },
        lg: { width: 18, height: 18, borderWidth: 3 },
    };

    const badgeSize = sizeStyles[size];

    return (
        <View
            style={[
                styles.badge,
                badgeSize,
                {
                    backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E',
                    borderColor: colors.background,
                },
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    badge: {
        borderRadius: 100,
        position: 'absolute',
        bottom: 0,
        right: 0,
    },
});
