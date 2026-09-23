/**
 * SegmentedTabs Component
 * Generic segmented tabs control for Create Post screen
 */

import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Shadows, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

export interface TabItem<T extends string> {
    key: T;
    label: string;
}

interface SegmentedTabsProps<T extends string> {
    tabs: TabItem<T>[];
    activeTab: T;
    onTabChange: (tab: T) => void;
}

export function SegmentedTabs<T extends string>({
    tabs,
    activeTab,
    onTabChange,
}: SegmentedTabsProps<T>) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const handleTabPress = (tab: T) => {
        if (tab !== activeTab) {
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onTabChange(tab);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.chipBackground }]}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.tab,
                            isActive && [
                                styles.activeTab,
                                {
                                    backgroundColor: colors.background,
                                    ...Shadows.md,
                                },
                            ],
                        ]}
                        onPress={() => handleTabPress(tab.key)}
                        activeOpacity={0.7}
                        testID={`tab-${tab.key}`}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                {
                                    color: isActive ? colors.text : colors.textSecondary,
                                    fontWeight: isActive
                                        ? Typography.weights.semibold
                                        : Typography.weights.normal,
                                },
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
        borderRadius: BorderRadius.full,
        padding: 4,
        gap: 4,
    },
    tab: {
        flex: 1,
        height: 40,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeTab: {
        // Shadow applied via Shadows.md
    },
    tabText: {
        fontSize: Typography.sizes.md,
        lineHeight: 20,
    },
});
