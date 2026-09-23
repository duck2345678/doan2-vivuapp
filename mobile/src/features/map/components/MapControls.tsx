import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors, MapColors, Shadows } from '@/shared/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { memo } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MapControlsProps {
    onLayersPress?: () => void;
    onMyLocationPress?: () => void;
    isLoadingLocation?: boolean;
    colorScheme?: 'light' | 'dark';
}

export const MapControls = memo(function MapControls({
    onLayersPress,
    onMyLocationPress,
    isLoadingLocation = false,
    colorScheme = 'light',
}: MapControlsProps) {
    const insets = useSafeAreaInsets();
    const colors = Colors[colorScheme];
    const mapColors = MapColors[colorScheme];

    // Bottom position accounts for bottom sheet (120px) + tab bar safe area
    const bottomPosition = 140 + Math.max(insets.bottom, 20);

    return (
        <View style={[styles.container, { bottom: bottomPosition }]}>
            {/* Layers Button */}
            <TouchableOpacity
                style={[
                    styles.controlButton,
                    { backgroundColor: mapColors.controlBackground },
                ]}
                onPress={onLayersPress}
                activeOpacity={0.7}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
                <MaterialIcons
                    name="layers"
                    size={24}
                    color={colors.icon}
                />
            </TouchableOpacity>


            {/* My Location Button */}
            <TouchableOpacity
                style={[
                    styles.controlButton,
                    { backgroundColor: mapColors.controlBackground },
                ]}
                onPress={onMyLocationPress}
                activeOpacity={0.7}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                disabled={isLoadingLocation}
            >
                {isLoadingLocation ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                    <MaterialIcons
                        name="my-location"
                        size={24}
                        color={colors.tint}
                    />
                )}
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: Spacing.screenPadding,
        gap: Spacing.sm,
    },
    controlButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.card,
    },
});
