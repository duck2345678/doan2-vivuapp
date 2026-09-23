/**
 * CommentListHeader Component
 * Section header for comments with title, count, and sort option
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface CommentListHeaderProps {
  totalComments: number;
  sortLabel?: string;
  onSortPress?: () => void;
}

export function CommentListHeader({
  totalComments,
  sortLabel = 'Mới nhất',
  onSortPress,
}: CommentListHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { borderBottomColor: colors.chipBackground }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Bình luận</Text>
      <View style={styles.rightSection}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {totalComments} bình luận
        </Text>
        <TouchableOpacity onPress={onSortPress} activeOpacity={0.7}>
          <Text style={[styles.sortText, { color: colors.actionBlue }]}>{sortLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.cardPadding - 4, // 12px
    paddingTop: Spacing.cardPadding - 4, // 12px
    paddingBottom: Spacing.cardPadding - 4, // 12px
    borderBottomWidth: 0.8,
  },
  title: {
    fontSize: Typography.sizes['15'], // 15px
    fontWeight: Typography.weights.bold,
    lineHeight: 22.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm, // 8px
  },
  countText: {
    fontSize: Typography.sizes['13'], // 13px
    fontWeight: Typography.weights.normal,
    lineHeight: 19.5,
  },
  sortText: {
    fontSize: Typography.sizes['13'], // 13px
    fontWeight: Typography.weights.normal,
    lineHeight: 19.5,
    textAlign: 'center',
  },
});
