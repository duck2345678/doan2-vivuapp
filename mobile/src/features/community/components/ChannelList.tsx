import { Href, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/shared/components/feedback';
import { Spinner } from '@/shared/components/ui';
import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { useChannels } from '../hooks/useChannels';
import type { Channel } from '../types/message.types';
import { ChannelItem } from './ChannelItem';

interface ChannelListProps {
  searchQuery: string;
}

/**
 * FlatList of group channels
 */
export function ChannelList({ searchQuery }: ChannelListProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();

  const { data, isLoading, error, refetch } = useChannels(
    1,
    20,
    searchQuery || undefined
  );

  const handleChannelPress = (channel: Channel) => {
    // Navigate to chat thread (stub screen)
    router.push(`/chat/${channel.id}` as Href);
  };

  const renderItem = ({ item }: { item: Channel }) => (
    <ChannelItem
      channel={item}
      onPress={handleChannelPress}
    />
  );

  const keyExtractor = (item: Channel) => item.id;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <Spinner size="lg" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <EmptyState
          icon="❌"
          title="Đã xảy ra lỗi"
          message="Không thể tải danh sách channel. Vui lòng thử lại."
          actionLabel="Thử lại"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const channels = data?.data || [];

  if (channels.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <EmptyState
          icon="👥"
          title={searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có channel'}
          message={
            searchQuery
              ? 'Thử tìm kiếm với từ khóa khác'
              : 'Tham gia hoặc tạo channel mới để kết nối cùng mọi người!'
          }
        />
      </View>
    );
  }

  return (
    <FlatList
      data={channels}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={[styles.list, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
