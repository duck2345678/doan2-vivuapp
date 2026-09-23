import * as Haptics from 'expo-haptics';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { MessagesSubTab } from '../types/message.types';

interface MessagesSubTabsProps {
  activeTab: MessagesSubTab;
  onTabChange: (tab: MessagesSubTab) => void;
}

/**
 * Inner segmented control for Hộp thư / Channel
 * Matches Figma node 204:537 design - 52px height, 44px buttons
 */
export function MessagesSubTabs({
  activeTab,
  onTabChange,
}: MessagesSubTabsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const tabs: { key: MessagesSubTab; label: string }[] = [
    { key: 'inbox', label: 'Hộp thư' },
    { key: 'channels', label: 'Channel' },
  ];

  const handleTabPress = (tab: MessagesSubTab) => {
    if (tab !== activeTab) {
      // Subtle haptic feedback on tab switch only
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTabChange(tab);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                    fontWeight: isActive
                      ? Typography.weights.medium
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    height: 52,
    borderRadius: BorderRadius.full,
    padding: 4,
    gap: 6,
  },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    // Shadow applied via Shadows.md
  },
  tabText: {
    fontSize: Typography.sizes.sm, // 14px
    lineHeight: 20,
  },
});
