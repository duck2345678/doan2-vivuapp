/**
 * ThreadInfoOptionRow Component
 * Option row with icon and label for thread settings
 * Matches Figma node 532:650
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface ThreadInfoOptionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  variant?: 'default' | 'danger';
  showDivider?: boolean;
  onPress: () => void;
}

/**
 * Single option row for thread info settings
 */
export function ThreadInfoOptionRow({
  icon,
  label,
  variant = 'default',
  showDivider = true,
  onPress,
}: ThreadInfoOptionRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const textColor = variant === 'danger' ? colors.error : colors.textPrimary;
  const iconColor = variant === 'danger' ? colors.error : colors.textPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        showDivider && [styles.divider, { borderBottomColor: colors.borderLight }],
        pressed && { backgroundColor: colors.muted },
      ]}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: Spacing.md,
    minHeight: 56,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.base, // 16px
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
    flex: 1,
  },
});
