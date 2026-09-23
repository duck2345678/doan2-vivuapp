/**
 * SentMediaPreviewGrid Component
 * Grid preview of sent media with "Xem tất cả" link
 * Matches Figma node 532:763
 */
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { MediaItem } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = Spacing.screenPadding;
const GRID_GAP = 8;
const COLUMNS = 3;
const ITEM_SIZE = Math.floor(
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS
);

interface SentMediaPreviewGridProps {
  media: MediaItem[];
  onViewAllPress: () => void;
  onItemPress?: (item: MediaItem) => void;
}

/**
 * Media grid preview with section header
 */
export function SentMediaPreviewGrid({
  media,
  onViewAllPress,
  onItemPress,
}: SentMediaPreviewGridProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  if (media.length === 0) {
    return null;
  }

  const displayMedia = media.slice(0, 6);
  const rows = [displayMedia.slice(0, 3), displayMedia.slice(3, 6)].filter(
    (row) => row.length > 0
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Media đã gửi
        </Text>
        <Pressable
          onPress={onViewAllPress}
          style={styles.viewAllButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Xem tất cả ảnh"
          accessibilityRole="button"
        >
          <Text style={[styles.viewAllText, { color: colors.actionBlue }]}>
            Xem tất cả
          </Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`${rowIndex}-${row.length}`} style={styles.row}>
            {row.map((item) => (
              <Pressable
                key={item.id}
                style={styles.mediaItem}
                onPress={() => onItemPress?.(item)}
                accessibilityLabel={`Ảnh ${item.id}`}
                accessibilityRole="button"
              >
                <Image
                  source={{ uri: item.url }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                />
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_PADDING,
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.base, // 16px
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
  },
  viewAllButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  viewAllText: {
    fontSize: Typography.sizes.md, // 14px
    fontWeight: Typography.weights.normal,
    lineHeight: 20,
    textAlign: 'center',
  },
  grid: {
    gap: GRID_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
