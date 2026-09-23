import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { ContentFilterTab } from '../types';

interface ContentTabChipsProps {
    activeTab: ContentFilterTab;
    onTabChange: (tab: ContentFilterTab) => void;
}

const TABS: { key: ContentFilterTab; label: string }[] = [
    { key: 'posts', label: 'Bài viết' },
    { key: 'itineraries', label: 'Lịch trình' },
    { key: 'channels', label: 'Channel' },
];

/**
 * Horizontal chip row for filtering content by type
 * - Active: Blue background, white text
 * - Inactive: Light gray background, dark text
 */
export function ContentTabChips({ activeTab, onTabChange }: ContentTabChipsProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const handlePress = (tab: ContentFilterTab) => {
        if (tab !== activeTab) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onTabChange(tab);
        }
    };

    return (
        <View testID="content-tab-chips" style={styles.container}>
            {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        testID={`chip-${tab.key}`}
                        style={[
                            styles.chip,
                            isActive ? styles.chipActive : styles.chipInactive,
                            { backgroundColor: isActive ? colors.actionBlue : '#F3F4F6' },
                        ]}
                        onPress={() => handlePress(tab.key)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                { color: isActive ? '#FFFFFF' : '#374151' },
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.screenPadding,
        paddingBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    chipActive: {
        // Active styling handled inline
    },
    chipInactive: {
        // Inactive styling handled inline
    },
    chipText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
        lineHeight: 20,
    },
});
