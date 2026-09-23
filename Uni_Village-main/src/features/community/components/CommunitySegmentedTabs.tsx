import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { CommunityTab } from '../types';

interface CommunitySegmentedTabsProps {
  activeTab: CommunityTab;
  onTabChange: (tab: CommunityTab) => void;
}

/**
 * Segmented control for switching between Posts and Messages
 */
export function CommunitySegmentedTabs({
  activeTab,
  onTabChange,
}: CommunitySegmentedTabsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const tabs: { key: CommunityTab; label: string }[] = [
    { key: 'posts', label: 'Bài viết' },
    { key: 'messages', label: 'Tin nhắn' },
  ];

  const handleTabPress = (tab: CommunityTab) => {
    if (tab !== activeTab) {
      // Subtle haptic feedback on tab switch only
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTabChange(tab);
    }
  };

  return (
    <View testID="community-tabs" style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabContainer, { backgroundColor: colors.chipBackground }]}>
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
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.text : colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 4,
    gap: 8,
  },
  tab: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    // Shadow applied via Shadows.md
  },
  tabText: {
    fontSize: Typography.sizes.base, // 16px
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
  },
});
