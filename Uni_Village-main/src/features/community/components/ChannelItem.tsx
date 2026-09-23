import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/shared/components/ui';
import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { Channel } from '../types/message.types';

interface ChannelItemProps {
  channel: Channel;
  onPress?: (channel: Channel) => void;
}

/**
 * Individual channel row for channel list
 * Matches Figma node 204:734 - includes member count icon
 */
export function ChannelItem({ channel, onPress }: ChannelItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const hasUnread = channel.unreadCount > 0;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress?.(channel)}
      activeOpacity={0.7}
    >
      {/* Avatar with unread indicator */}
      <View style={styles.avatarContainer}>
        <Avatar
          source={channel.avatarUrl}
          name={channel.name}
          size="md"
          style={styles.avatar}
        />
        {hasUnread && (
          <View
            style={[
              styles.unreadIndicator,
              { backgroundColor: colors.fabBlue },
            ]}
          />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.name,
                {
                  color: colors.text,
                  fontWeight: hasUnread
                    ? Typography.weights.semibold
                    : Typography.weights.medium,
                },
              ]}
              numberOfLines={1}
            >
              {channel.name}
            </Text>
            {/* Member count */}
            <View style={styles.memberCount}>
              <MaterialIcons
                name="people"
                size={12}
                color={colors.textSecondary}
              />
              <Text style={[styles.memberCountText, { color: colors.textSecondary }]}>
                {channel.memberCount}
              </Text>
            </View>
          </View>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {channel.timeLabel}
          </Text>
        </View>
        <Text
          style={[
            styles.preview,
            {
              color: colors.textSecondary,
              fontWeight: hasUnread
                ? Typography.weights.medium
                : Typography.weights.normal,
            },
          ]}
          numberOfLines={1}
        >
          <Text style={styles.senderName}>{channel.lastMessage.senderName}: </Text>
          {channel.lastMessage.content}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.xs,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 8,
  },
  name: {
    fontSize: Typography.sizes.base, // 16px
    lineHeight: 24,
    flexShrink: 1,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  memberCountText: {
    fontSize: Typography.sizes.xs, // 12px
    lineHeight: 16,
  },
  time: {
    fontSize: Typography.sizes.xs, // 12px
    lineHeight: 16,
  },
  preview: {
    fontSize: Typography.sizes.sm, // 14px
    lineHeight: 20,
  },
  senderName: {
    fontWeight: Typography.weights.medium,
  },
});
