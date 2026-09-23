import { FlashList } from '@shopify/flash-list';
import { Href, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActionSheetIOS, Platform, StyleSheet, View } from 'react-native';

import { MessageRequestsEntryRow } from '@/features/chat/components';
import { useDeleteConversation } from '@/features/chat/hooks';
import { EmptyState } from '@/shared/components/feedback';
import { Spinner } from '@/shared/components/ui';
import { ConfirmModal } from '@/shared/components/ui/ConfirmModal';
import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { useConversations } from '../hooks/useConversations';
import type { Conversation } from '../types/message.types';
import { ConversationItem } from './ConversationItem';

interface InboxListProps {
  searchQuery: string;
}

/**
 * FlashList of direct message conversations
 * Optimization: Replaced FlatList with FlashList for better performance with large lists
 */
export function InboxList({ searchQuery }: InboxListProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();

  const { data, isLoading, error, refetch } = useConversations(
    1,
    20,
    searchQuery || undefined
  );

  // Delete conversation state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { deleteConversation, isDeleting } = useDeleteConversation({ navigateAfterDelete: false });

  const handleConversationPress = (conversation: Conversation) => {
    // Navigate to chat thread (stub screen)
    router.push(`/chat/${conversation.id}` as Href);
  };

  const handleLongPress = useCallback((conversation: Conversation) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Hủy', 'Xóa cuộc hội thoại'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: conversation.participant.displayName,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setSelectedConversation(conversation);
            setDeleteModalVisible(true);
          }
        }
      );
    } else {
      // Android - show confirm modal directly
      setSelectedConversation(conversation);
      setDeleteModalVisible(true);
    }
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (selectedConversation) {
      try {
        await deleteConversation.mutateAsync(selectedConversation.id);
        setDeleteModalVisible(false);
        setSelectedConversation(null);
      } catch {
        // Error handled by hook
      }
    }
  }, [selectedConversation, deleteConversation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalVisible(false);
    setSelectedConversation(null);
  }, []);

  const renderItem = ({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      onPress={handleConversationPress}
      onLongPress={handleLongPress}
    />
  );

  const keyExtractor = (item: Conversation) => item.id;

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
          message="Không thể tải tin nhắn. Vui lòng thử lại."
          actionLabel="Thử lại"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const conversations = data?.data || [];

  if (conversations.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <EmptyState
          icon="💬"
          title={searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có tin nhắn'}
          message={
            searchQuery
              ? 'Thử tìm kiếm với từ khóa khác'
              : 'Bắt đầu trò chuyện với bạn bè ngay!'
          }
        />
      </View>
    );
  }

  return (
    <>
      <FlashList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={74}
        ListHeaderComponent={<MessageRequestsEntryRow />}
        style={[styles.list, { backgroundColor: colors.backgroundSecondary }]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      <ConfirmModal
        visible={deleteModalVisible}
        title="Xóa cuộc hội thoại"
        message={`Bạn có chắc chắn muốn xóa cuộc hội thoại với ${selectedConversation?.participant.displayName ?? ''}? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={isDeleting}
      />
    </>
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
