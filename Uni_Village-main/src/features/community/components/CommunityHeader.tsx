import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

/**
 * Community screen header with title "Cộng đồng"
 */
export function CommunityHeader() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Cộng đồng</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
    height: 72 + 44, // 72px content + safe area estimate
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: Typography.sizes['2xl'], // 24px
    fontWeight: Typography.weights.semibold,
    lineHeight: 32,
  },
});
