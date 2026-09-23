/**
 * ThreadInfoActionsRow Component
 * Quick actions row with 3 buttons: Search, Profile, Mute
 * Matches Figma node 532:711
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface ActionItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface ThreadInfoActionsRowProps {
  onSearchPress: () => void;
  onProfilePress: () => void;
  onMutePress: () => void;
  isMuted?: boolean;
}

/**
 * Quick actions row with icon buttons
 */
export function ThreadInfoActionsRow({
  onSearchPress,
  onProfilePress,
  onMutePress,
  isMuted = false,
}: ThreadInfoActionsRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const actions: ActionItem[] = [
    {
      id: 'search',
      icon: 'search-outline',
      label: 'Tìm kiếm',
      onPress: onSearchPress,
    },
    {
      id: 'profile',
      icon: 'person-outline',
      label: 'Trang cá nhân',
      onPress: onProfilePress,
    },
    {
      id: 'mute',
      icon: isMuted ? 'notifications-off-outline' : 'notifications-outline',
      label: isMuted ? 'Bật thông báo' : 'Tắt thông báo',
      onPress: onMutePress,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.borderLight,
          borderBottomColor: colors.borderLight,
        },
      ]}
    >
      {actions.map((action) => (
        <Pressable
          key={action.id}
          style={styles.actionButton}
          onPress={action.onPress}
          accessibilityLabel={action.label}
          accessibilityRole="button"
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.chipBackground },
            ]}
          >
            <Ionicons name={action.icon} size={24} color={colors.actionButtonText} />
          </View>
          <Text style={[styles.label, { color: colors.actionButtonText }]}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 0.8,
    borderBottomWidth: 0.8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    paddingHorizontal: Spacing.xs,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.sizes.md, // 14px
    fontWeight: Typography.weights.normal,
    lineHeight: 20,
    textAlign: 'center',
  },
});
