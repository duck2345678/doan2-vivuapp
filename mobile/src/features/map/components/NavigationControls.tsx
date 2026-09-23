/**
 * NavigationControls - Navigation mode control buttons
 *
 * Displays exit and my-location buttons during active navigation.
 * Extracted from MapScreen for better component separation.
 */

import { Spacing } from '@/shared/constants/spacing';
import { Colors, MapColors, Shadows } from '@/shared/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavigationControlsProps {
    /** Callback when exit button is pressed */
    onExit: () => void;
    /** Callback when my location button is pressed */
    onMyLocationPress?: () => void;
    /** Whether location is currently being fetched */
    isLoadingLocation?: boolean;
    /** Color scheme */
    colorScheme?: 'light' | 'dark';
}

export const NavigationControls = memo(function NavigationControls({
    onExit,
    onMyLocationPress,
    isLoadingLocation = false,
    colorScheme = 'light',
}: NavigationControlsProps) {
    const insets = useSafeAreaInsets();
    const colors = Colors[colorScheme];
    const mapColors = MapColors[colorScheme];

    // Bottom position accounts for safe area + some padding
    const bottomPosition = Spacing.screenPadding + Math.max(insets.bottom, 20) + 20;

    return (
        <View style={[styles.container, { bottom: bottomPosition }]}>
            {/* Exit Navigation Button */}
            <TouchableOpacity
                style={[styles.button, styles.exitButton]}
                onPress={onExit}
                activeOpacity={0.8}
            >
                <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {/* My Location Button */}
            <TouchableOpacity
                style={[styles.button, styles.myLocationButton, { backgroundColor: mapColors.controlBackground }]}
                onPress={onMyLocationPress}
                activeOpacity={0.7}
                disabled={isLoadingLocation}
            >
                {isLoadingLocation ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                    <MaterialIcons name="my-location" size={24} color={colors.tint} />
                )}
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: Spacing.screenPadding,
        alignItems: 'center',
    },
    button: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        ...Shadows.lg,
    },
    exitButton: {
        backgroundColor: '#EF4444',
    },
    myLocationButton: {
        // Background color set dynamically via mapColors.controlBackground
    },
});
