/**
 * PinnedMessageBar Component
 * Displays a pinned message banner with dismiss functionality
 * Matches Figma node 317:2919
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import type { PinnedMessage } from '../types';

interface PinnedMessageBarProps {
  pinnedMessage: PinnedMessage;
  onDismiss?: () => void;
}

/**
 * Pinned message banner (dismissible)
 */
export function PinnedMessageBar({
  pinnedMessage,
  onDismiss,
}: PinnedMessageBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.pinnedBackground,
          borderColor: colors.pinnedBorder,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Pin icon */}
        <Ionicons
          name="pin"
          size={16}
          color={colors.pinnedLabel}
          style={styles.pinIcon}
        />
        
        {/* Label */}
        <Text style={[styles.label, { color: colors.pinnedLabel }]}>
          Ghim:
        </Text>
        
        {/* Message text */}
        <Text
          style={[styles.messageText, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {pinnedMessage.text}
        </Text>
      </View>

      {/* Dismiss button */}
      <Pressable
        onPress={handleDismiss}
        style={styles.dismissButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Đóng thông báo ghim"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    marginRight: Spacing.xs,
    transform: [{ rotate: '45deg' }],
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginRight: Spacing.xs,
  },
  messageText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.normal,
    lineHeight: 20,
  },
  dismissButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
});
