/**
 * SocialAuthButtons Component
 * Google authentication circular button only
 */

import { Colors, Shadows } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

interface SocialAuthButtonsProps {
    onGooglePress: () => void;
    isLoading?: boolean;
}

export function SocialAuthButtons({
    onGooglePress,
    isLoading = false,
}: SocialAuthButtonsProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: colors.card },
                    pressed && styles.buttonPressed,
                    isLoading && styles.buttonDisabled,
                ]}
                onPress={onGooglePress}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#DB4437" />
                ) : (
                    <Ionicons name="logo-google" size={24} color="#DB4437" />
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
    },
    button: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.95 }],
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
