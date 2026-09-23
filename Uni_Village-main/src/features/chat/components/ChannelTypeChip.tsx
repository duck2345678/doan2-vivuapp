/**
 * ChannelTypeChip Component
 * Selectable category chip for channel type selection
 * Matches Figma node 499:1460
 */
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import type { ChannelCategoryInfo } from '../types/channel.types';

interface ChannelTypeChipProps {
  category: ChannelCategoryInfo;
  isSelected: boolean;
  onPress: () => void;
}

/**
 * Selectable chip for channel category
 */
export function ChannelTypeChip({
  category,
  isSelected,
  onPress,
}: ChannelTypeChipProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        isSelected
          ? {
              backgroundColor: colors.selectedChipBg,
              borderColor: colors.fabBlue,
            }
          : {
              backgroundColor: colors.background,
              borderColor: colors.borderLight,
            },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={category.label}
    >
      <MaterialIcons
        name={category.icon as keyof typeof MaterialIcons.glyphMap}
        size={20}
        color={isSelected ? colors.fabBlue : colors.textSecondary}
        style={styles.icon}
      />
      <Text
        style={[
          styles.label,
          {
            color: isSelected ? colors.actionBlue : colors.textPrimary,
            fontWeight: isSelected
              ? Typography.weights.semibold
              : Typography.weights.normal,
          },
        ]}
      >
        {category.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    flex: 1,
    minWidth: '45%',
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  label: {
    fontSize: Typography.sizes.md,
  },
});
