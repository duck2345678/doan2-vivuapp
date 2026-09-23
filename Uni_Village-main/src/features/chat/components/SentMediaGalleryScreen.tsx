/**
 * SentMediaGalleryScreen Component
 * Full gallery of sent media in a chat thread
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useNavigation } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import { useSentMedia } from '../hooks';
import type { MediaItem } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 2;
const COLUMNS = 3;
const ITEM_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING * (COLUMNS + 1)) / COLUMNS);

interface SentMediaGalleryScreenProps {
  threadId: string;
}

/**
 * Full media gallery screen
 */
export function SentMediaGalleryScreen({ threadId }: SentMediaGalleryScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const { data, isLoading, error } = useSentMedia(threadId, 1, 100);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
    }
  }, [navigation]);

  const handleItemPress = useCallback((item: MediaItem) => {
    console.log('Media item pressed:', item.id);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <Pressable
        style={styles.mediaItem}
        onPress={() => handleItemPress(item)}
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
    ),
    [handleItemPress]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Chưa có ảnh nào được gửi
        </Text>
      </View>
    ),
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Ảnh đã gửi
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Không thể tải ảnh
          </Text>
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={COLUMNS}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={ListEmptyComponent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 0.5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg, // 18px
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.sizes.base,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  listContent: {
    padding: GRID_PADDING,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: GRID_PADDING / 2,
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: Typography.sizes.base,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
