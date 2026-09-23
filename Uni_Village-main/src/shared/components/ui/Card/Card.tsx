/**
 * Card Component
 * Base card container with variants
 * Supports light/dark mode theming
 */

import { Colors } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

export type CardVariant = 'elevated' | 'outlined' | 'filled';

export interface CardProps extends ViewProps {
    variant?: CardVariant;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    onPress?: () => void;
    style?: ViewStyle;
    children: React.ReactNode;
}

export function Card({
    variant = 'elevated',
    padding = 'md',
    onPress,
    style,
    children,
    ...viewProps
}: CardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    // Dynamic variant styles based on color scheme
    const variantStyles: Record<CardVariant, ViewStyle> = {
        elevated: {
            backgroundColor: colors.card,
            shadowColor: colorScheme === 'dark' ? '#000' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 4,
        },
        outlined: {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
        },
        filled: {
            backgroundColor: colors.muted,
        },
    };

    const getPressableStyle = useCallback(
        ({ pressed }: { pressed: boolean }) => [
            styles.base,
            variantStyles[variant],
            styles[`padding_${padding}` as keyof typeof styles] as ViewStyle,
            style,
            pressed && styles.pressed,
        ].filter(Boolean),
        [variant, padding, style, colorScheme]
    );

    if (onPress) {
        return (
            <Pressable
                style={getPressableStyle}
                onPress={onPress}
                {...viewProps}
            >
                {children}
            </Pressable>
        );
    }

    return (
        <View style={getPressableStyle({ pressed: false })} {...viewProps}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    // Padding
    padding_none: {
        padding: 0,
    },
    padding_sm: {
        padding: 12,
    },
    padding_md: {
        padding: 16,
    },
    padding_lg: {
        padding: 24,
    },
    // States
    pressed: {
        opacity: 0.95,
        transform: [{ scale: 0.99 }],
    },
});
