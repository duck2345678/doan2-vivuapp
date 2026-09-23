/**
 * ThreadInfoScreen Component
 * Chat thread info screen with profile, actions, and settings
 * Matches Figma node 532:649
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/shared/components/ui';
import { ConfirmModal } from '@/shared/components/ui/ConfirmModal';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { handleApiError, showErrorToast } from '@/shared/utils';

import { useDeleteConversation, useSentMediaPreview, useThreadInfo } from '../hooks';
import { toggleThreadMute } from '../services';
import { SentMediaPreviewGrid } from './SentMediaPreviewGrid';
import { ThreadInfoActionsRow } from './ThreadInfoActionsRow';
import { ThreadInfoHeader } from './ThreadInfoHeader';
import { ThreadInfoOptionRow } from './ThreadInfoOptionRow';

interface ThreadInfoScreenProps {
  threadId: string;
}

/**
 * Thread info screen content
 */
export function ThreadInfoScreen({ threadId }: ThreadInfoScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const { data: threadInfo, isLoading, error } = useThreadInfo(threadId);
  const { data: sentMedia = [] } = useSentMediaPreview(threadId);
  const { deleteConversation, isDeleting } = useDeleteConversation();

  const [isMuted, setIsMuted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  React.useEffect(() => {
    if (threadInfo) {
      setIsMuted(threadInfo.isMuted);
    }
  }, [threadInfo]);

  const handleSearchPress = useCallback(() => {
    Alert.alert('Tìm kiếm', 'Chức năng tìm kiếm tin nhắn sẽ được cập nhật.');
  }, []);

  const handleProfilePress = useCallback(() => {
    if (threadInfo?.peerId) {
      router.push(`/profile/${threadInfo.peerId}`);
    }
  }, [threadInfo?.peerId]);

  const handleMutePress = useCallback(async () => {
    if (!threadId) return;

    const previousMuteState = isMuted;
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);

    try {
      await toggleThreadMute(threadId);
    } catch (err) {
      setIsMuted(previousMuteState);
      showErrorToast('Không thể thay đổi trạng thái thông báo');
    }
  }, [threadId, isMuted]);

  const handleReportPress = useCallback(() => {
    Alert.alert(
      'Báo cáo người dùng',
      'Bạn có chắc chắn muốn báo cáo người dùng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Báo cáo',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Đã gửi', 'Báo cáo của bạn đã được gửi.');
          },
        },
      ]
    );
  }, []);

  const handleBlockPress = useCallback(() => {
    Alert.alert(
      'Chặn người dùng',
      'Bạn có chắc chắn muốn chặn người dùng này? Họ sẽ không thể nhắn tin cho bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chặn',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Đã chặn', 'Người dùng đã bị chặn.');
          },
        },
      ]
    );
  }, []);



  const handleDeletePress = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!threadId) return;
    deleteConversation.mutate(threadId);
  }, [threadId, deleteConversation]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const handleViewAllMediaPress = useCallback(() => {
    router.push(`/chat/${threadId}/media`);
  }, [threadId]);

  const handleMediaItemPress = useCallback((item: { id: string; url: string }) => {
    console.log('Media item pressed:', item.id);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <ThreadInfoHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (error || !threadInfo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <ThreadInfoHeader />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Không thể tải thông tin
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ThreadInfoHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileSection, { backgroundColor: colors.background }]}>
          <Avatar
            source={threadInfo.peerAvatarUrl}
            name={threadInfo.peerName}
            size="xxl"
          />
          <Text style={[styles.peerName, { color: colors.textPrimary }]}>
            {threadInfo.peerName}
          </Text>
        </View>

        <ThreadInfoActionsRow
          onSearchPress={handleSearchPress}
          onProfilePress={handleProfilePress}
          onMutePress={handleMutePress}
          isMuted={isMuted}
        />

        <View style={[styles.optionsSection, { backgroundColor: colors.background }]}>
          <ThreadInfoOptionRow
            icon="alert-circle-outline"
            label="Báo cáo"
            onPress={handleReportPress}
          />
          <ThreadInfoOptionRow
            icon="ban-outline"
            label="Chặn người dùng"
            onPress={handleBlockPress}
          />

          <ThreadInfoOptionRow
            icon="trash-outline"
            label="Xóa lịch sử trò chuyện"
            variant="danger"
            showDivider={false}
            onPress={handleDeletePress}
          />
        </View>

        {sentMedia.length > 0 && (
          <View style={[styles.mediaSection, { backgroundColor: colors.background }]}>
            <SentMediaPreviewGrid
              media={sentMedia}
              onViewAllPress={handleViewAllMediaPress}
              onItemPress={handleMediaItemPress}
            />
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={showDeleteModal}
        title="Xóa lịch sử trò chuyện"
        message="Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  peerName: {
    fontSize: Typography.sizes.xl, // 20px
    fontWeight: Typography.weights.normal,
    lineHeight: 28,
    marginTop: Spacing.md,
  },
  optionsSection: {
    marginTop: Spacing.sm,
  },
  mediaSection: {
    marginTop: Spacing.sm,
  },
});
