/**
 * SelectedMemberChip Component
 * Chip showing selected member with avatar and remove button
 * Matches Figma node 317:3862
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/shared/components/ui';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import type { UserPreview } from '../types';

interface SelectedMemberChipProps {
  user: UserPreview;
  onRemove: (userId: number) => void;
}

/**
 * Selected member chip with avatar, name and remove button
 */
export function SelectedMemberChip({ user, onRemove }: SelectedMemberChipProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handleRemove = () => {
    onRemove(user.id);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.selectedChipBg,
          borderColor: colors.selectedChipBorder,
        },
      ]}
    >
      <Avatar source={user.avatarUrl} name={user.displayName} size="xs" />
      <Text
        style={[styles.name, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {user.displayName}
      </Text>
      <Pressable
        onPress={handleRemove}
        style={styles.removeButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={`Xóa ${user.displayName}`}
        accessibilityRole="button"
      >
        <Ionicons name="close" size={14} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: 9999,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  name: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    maxWidth: 100,
  },
  removeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
