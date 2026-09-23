/**
 * SystemMessageBubble Component
 * Displays system messages (e.g., "X added Y to the group")
 * Centered text with muted styling
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface SystemMessageBubbleProps {
  text: string;
  timeLabel?: string;
}

/**
 * System message bubble - centered, muted styling
 */
export const SystemMessageBubble = memo(function SystemMessageBubble({
  text,
  timeLabel,
}: SystemMessageBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: colors.chipBackground }]}>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {text}
        </Text>
      </View>
      {timeLabel && (
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {timeLabel}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    maxWidth: '80%',
  },
  text: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.normal,
    textAlign: 'center',
    lineHeight: 18,
  },
  time: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
});
