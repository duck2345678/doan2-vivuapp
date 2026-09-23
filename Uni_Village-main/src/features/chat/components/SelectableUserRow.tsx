/**
 * SelectableUserRow Component
 * User row with avatar, name and selection checkbox
 * Matches Figma node 317:3862
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/shared/components/ui';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import type { UserPreview } from '../types';

interface SelectableUserRowProps {
  user: UserPreview;
  isSelected: boolean;
  onToggle: (user: UserPreview) => void;
}

/**
 * Selectable user row for add member list
 */
export function SelectableUserRow({
  user,
  isSelected,
  onToggle,
}: SelectableUserRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handlePress = () => {
    onToggle(user);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${user.displayName}${isSelected ? ', đã chọn' : ''}`}
    >
      {/* User info */}
      <Avatar source={user.avatarUrl} name={user.displayName} size="lg" />
      <View style={styles.textContainer}>
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {user.displayName}
        </Text>
        {user.phone && (
          <Text
            style={[styles.phone, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {user.phone}
          </Text>
        )}
      </View>

      {/* Selection checkbox */}
      <View
        style={[
          styles.checkbox,
          isSelected
            ? { backgroundColor: colors.fabBlue, borderColor: colors.fabBlue }
            : { borderColor: colors.checkboxBorder },
        ]}
      >
        {isSelected && (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  textContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  name: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    lineHeight: 24,
  },
  phone: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.normal,
    lineHeight: 20,
    marginTop: 2,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
