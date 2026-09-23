/**
 * GroupChatHeader Component
 * Custom header for group chats with back button, avatar, title, member count, and action icons
 * Matches Figma node 317:2919
 */
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/shared/components/ui';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import type { GroupThread } from '../types';

interface GroupChatHeaderProps {
  thread: GroupThread;
  onNotificationPress?: () => void;
  onAddMemberPress?: () => void;
  onInfoPress?: () => void;
}

/**
 * Group chat header with group info and action icons
 */
export function GroupChatHeader({
  thread,
  onNotificationPress,
  onAddMemberPress,
  onInfoPress,
}: GroupChatHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = () => {
    // Check if we can go back, otherwise navigate to home
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/community');
    }
  };

  const handleNotification = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      console.log('Notification pressed for group:', thread.id);
    }
  };

  const handleAddMember = () => {
    if (onAddMemberPress) {
      onAddMemberPress();
    } else {
      console.log('Add member pressed for group:', thread.id);
    }
  };

  const handleInfo = () => {
    if (onInfoPress) {
      onInfoPress();
    } else {
      console.log('Info pressed for group:', thread.id);
    }
  };

  // Format member count text
  const memberText = `${thread.memberCount} thành viên, ${thread.onlineCount} online`;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: colors.background,
          borderBottomColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Back button */}
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        {/* Group Avatar + Name + Member Count */}
        <View style={styles.groupInfo}>
          <Avatar
            source={thread.avatarUrl}
            name={thread.name}
            size="md"
          />
          <View style={styles.textContainer}>
            <Text
              style={[styles.groupName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {thread.name}
            </Text>
            <Text
              style={[styles.memberCount, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {memberText}
            </Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Action Icons */}
        <View style={styles.actions}>
          {/* Notification Bell */}
          <Pressable
            onPress={handleNotification}
            style={styles.iconButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Thông báo"
            accessibilityRole="button"
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text}
            />
          </Pressable>

          {/* Add Member */}
          <Pressable
            onPress={handleAddMember}
            style={styles.iconButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Thêm thành viên"
            accessibilityRole="button"
          >
            <Ionicons
              name="person-add-outline"
              size={22}
              color={colors.text}
            />
          </Pressable>

          {/* Info */}
          <Pressable
            onPress={handleInfo}
            style={styles.iconButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Thông tin nhóm"
            accessibilityRole="button"
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.xs,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  groupName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    lineHeight: 24,
  },
  memberCount: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.normal,
    lineHeight: 18,
  },
  spacer: {
    width: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
