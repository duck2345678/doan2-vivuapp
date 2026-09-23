/**
 * ToggleSettingRow Component
 * Settings row with icon, label, description, and toggle switch
 * Matches Figma node 499:1460
 */
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface ToggleSettingRowProps {
  icon: React.ReactNode;
  iconBackgroundColor: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/**
 * Toggle setting row with icon and description
 */
export function ToggleSettingRow({
  icon,
  iconBackgroundColor,
  title,
  description,
  value,
  onValueChange,
}: ToggleSettingRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handlePress = () => {
    onValueChange(!value);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: iconBackgroundColor },
        ]}
      >
        {icon}
      </View>

      {/* Text content */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>

      {/* Toggle */}
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.checkboxBorder,
          true: colors.actionBlue,
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.checkboxBorder}
      />
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
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    marginBottom: 2,
  },
  description: {
    fontSize: Typography.sizes.xs,
  },
});
