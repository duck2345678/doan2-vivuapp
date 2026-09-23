/**
 * PrimaryButton Component
 * Green pill button with shadow and disabled state
 */

import { Colors, Shadows } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks';
import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
} from 'react-native';

interface PrimaryButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
}

export function PrimaryButton({
    title,
    onPress,
    disabled = false,
    loading = false,
}: PrimaryButtonProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const isDisabled = disabled || loading;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.authPrimaryButton },
                !isDisabled && Shadows.md,
                pressed && !isDisabled && { backgroundColor: colors.authPrimaryButtonPressed },
                isDisabled && styles.buttonDisabled,
            ]}
            onPress={onPress}
            disabled={isDisabled}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
                <Text style={styles.buttonText}>{title}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 56,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
});
