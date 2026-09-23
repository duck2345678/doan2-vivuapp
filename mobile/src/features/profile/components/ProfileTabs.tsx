/**
 * ProfileTabs Component
 * Two tabs: "Bài viết của tôi" and "Bài viết yêu thích" with underline indicator
 */

import { Colors } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ms, s, vs } from 'react-native-size-matters';

export type ProfileTabKey = 'my-posts' | 'favorites';

interface ProfileTabsProps {
    activeTab: ProfileTabKey;
    onTabChange: (tab: ProfileTabKey) => void;
}

const TABS: { key: ProfileTabKey; label: string }[] = [
    { key: 'my-posts', label: 'Bài viết của tôi' },
    { key: 'favorites', label: 'Bài viết đã lưu' },
];

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={[styles.container, { borderBottomColor: colors.border }]}>
            {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <Pressable
                        key={tab.key}
                        style={styles.tab}
                        onPress={() => onTabChange(tab.key)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                {
                                    color: isActive ? colors.tint : colors.icon,
                                    fontWeight: isActive ? '600' : '400',
                                },
                            ]}
                        >
                            {tab.label}
                        </Text>
                        {isActive && (
                            <View
                                style={[styles.indicator, { backgroundColor: colors.tint }]}
                            />
                        )}
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: vs(16),
        position: 'relative',
    },
    tabText: {
        fontSize: ms(14),
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        left: s(24),
        right: s(24),
        height: vs(3),
        borderRadius: ms(2),
    },
});
