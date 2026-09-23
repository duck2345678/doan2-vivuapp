/**
 * ProfileHeaderIcons Component
 * Top header icons: analytics (left), search + settings (right)
 */

import { Colors } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ms, s, vs } from 'react-native-size-matters';

interface ProfileHeaderIconsProps {
    onAnalyticsPress?: () => void;
    onSearchPress?: () => void;
    onSettingsPress?: () => void;
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export function ProfileHeaderIcons({
    onAnalyticsPress,
    onSearchPress,
    onSettingsPress,
}: ProfileHeaderIconsProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const iconSize = ms(24);

    return (
        <View style={styles.container}>
            {/* Left: Analytics icon */}
            <Pressable
                style={styles.iconButton}
                hitSlop={HIT_SLOP}
                onPress={onAnalyticsPress}
                accessibilityLabel="Analytics"
                accessibilityRole="button"
            >
                <MaterialIcons name="bar-chart" size={iconSize} color={colors.text} />
            </Pressable>

            {/* Right: Search + Settings icons */}
            <View style={styles.rightIcons}>
                <Pressable
                    style={styles.iconButton}
                    hitSlop={HIT_SLOP}
                    onPress={onSearchPress}
                    accessibilityLabel="Search"
                    accessibilityRole="button"
                >
                    <MaterialIcons name="search" size={iconSize} color={colors.text} />
                </Pressable>
                <Pressable
                    style={styles.iconButton}
                    hitSlop={HIT_SLOP}
                    onPress={onSettingsPress}
                    accessibilityLabel="Settings"
                    accessibilityRole="button"
                >
                    <MaterialIcons name="settings" size={iconSize} color={colors.text} />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: s(16),
        paddingVertical: vs(8),
    },
    iconButton: {
        width: s(44),
        height: vs(44),
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
    },
});
