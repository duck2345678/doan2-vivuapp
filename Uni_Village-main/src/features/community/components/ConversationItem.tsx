import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/shared/components/ui';
import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { Conversation } from '../types/message.types';

interface ConversationItemProps {
  conversation: Conversation;
  onPress?: (conversation: Conversation) => void;
  onLongPress?: (conversation: Conversation) => void;
}

/**
 * Individual conversation row for inbox list
 * Matches Figma node 204:537 - 70px height, 44px avatar
 */
export function ConversationItem({ conversation, onPress, onLongPress }: ConversationItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const hasUnread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress?.(conversation)}
      onLongPress={() => onLongPress?.(conversation)}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      {/* Avatar with unread indicator */}
      <View style={styles.avatarContainer}>
        <Avatar
          source={conversation.participant.avatarUrl}
          name={conversation.participant.displayName}
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
            {conversation.participant.displayName}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {conversation.timeLabel}
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
          {conversation.lastMessage.content}
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
  name: {
    flex: 1,
    fontSize: Typography.sizes.base, // 16px
    lineHeight: 24,
    marginRight: 8,
  },
  time: {
    fontSize: Typography.sizes.xs, // 12px
    lineHeight: 16,
  },
  preview: {
    fontSize: Typography.sizes.sm, // 14px
    lineHeight: 20,
  },
});
