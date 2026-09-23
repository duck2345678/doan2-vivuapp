/**
 * SenderLabel Component
 * Displays sender avatar and name above message bubble in group chats
 * Matches Figma node 317:2919
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/shared/components/ui';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface SenderLabelProps {
  senderName: string;
  senderAvatar?: string;
}

/**
 * Sender info row (avatar + name) for group chat messages
 */
export function SenderLabel({ senderName, senderAvatar }: SenderLabelProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <Avatar
        source={senderAvatar}
        name={senderName}
        size="xs"
      />
      <Text style={[styles.senderName, { color: colors.textSecondary }]}>
        {senderName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  senderName: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    lineHeight: 18,
  },
});
