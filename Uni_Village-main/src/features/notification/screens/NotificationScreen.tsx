/**
 * NotificationScreen
 * Main screen for displaying all notifications
 */

import { Colors } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NotificationItem } from "../components/NotificationItem";
import { useNotificationStore } from "../store";
import { NotificationResponse, NotificationType } from "../types";

export const NotificationScreen: React.FC = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const {
    notifications,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchNotifications,
    fetchMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  // Initial fetch
  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // Handle notification press
  const handleNotificationPress = useCallback(
    async (notification: NotificationResponse) => {
      // Mark as read
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }

      // Navigate based on notification type
      const { reference, type } = notification;

      switch (type) {
        case NotificationType.POST_REACTION:
        case NotificationType.POST_COMMENT:
        case NotificationType.COMMENT_REPLY:
        case NotificationType.POST_REMOVED:
          if (reference.postId) {
            router.push(`/post/${reference.postId}`);
          }
          break;

        case NotificationType.FRIEND_REQUEST:
        case NotificationType.FRIEND_ACCEPTED:
          if (reference.userId) {
            router.push(`/profile/${reference.userId}`);
          }
          break;

        case NotificationType.CHANNEL_INVITE:
        case NotificationType.JOIN_REQUEST_ACCEPTED:
        case NotificationType.JOIN_REQUEST_REJECTED:
          if (reference.conversationId) {
            router.push(`/chat/${reference.conversationId}`);
          }
          break;

        case NotificationType.ADMIN_WARNING:
          // Just show the notification, no navigation needed
          break;

        default:
          break;
      }
    },
    [markAsRead, router],
  );

  // Handle delete
  const handleDelete = useCallback(
    (id: number) => {
      deleteNotification(id);
    },
    [deleteNotification],
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchMoreNotifications();
    }
  }, [isLoadingMore, hasMore, fetchMoreNotifications]);

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: NotificationResponse }) => (
      <NotificationItem
        notification={item}
        onPress={handleNotificationPress}
        onDelete={handleDelete}
      />
    ),
    [handleNotificationPress, handleDelete],
  );

  // Render footer
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore, colors.primary]);

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Không có thông báo nào
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Các thông báo mới sẽ xuất hiện ở đây
        </Text>
      </View>
    );
  }, [isLoading, colors.textSecondary]);

  // Key extractor
  const keyExtractor = useCallback(
    (item: NotificationResponse) => String(item.id),
    [],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Thông báo
        </Text>
        <Pressable onPress={markAllAsRead} style={styles.markAllButton}>
          <Ionicons name="checkmark-done" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Content */}
      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && notifications.length > 0}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  markAllButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});

export default NotificationScreen;
