/**
 * PublicProfileScreen Component
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReportModal } from "@/components/ReportModal";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useReportUser } from "@/features/post/hooks/useReports";
import { Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";

import { useProfilePosts, usePublicProfile } from "../hooks";
import type { ProfilePost, PublicProfileTab } from "../types";
import { ProfilePostCard } from "./ProfilePostCard";
import { PublicProfileHeader } from "./PublicProfileHeader";
import { PublicProfileTabs } from "./PublicProfileTabs";

interface PublicProfileScreenProps {
  userId: number;
}

export function PublicProfileScreen({ userId }: PublicProfileScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<PublicProfileTab>("posts");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = usePublicProfile(userId);
  const { data: posts = [], isLoading: isPostsLoading } = useProfilePosts(
    userId,
    activeTab,
  );

  // Check if viewing own profile to hide message button
  const currentUser = useAuthStore((state) => state.user);
  const isOwnProfile = currentUser?.id === userId;

  // Report user mutation
  const { mutate: reportUser, isPending: isReporting } = useReportUser();

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleSearch = useCallback(() => {
    Alert.alert("Tìm kiếm", "Chức năng tìm kiếm sẽ được cập nhật.");
  }, []);

  const handleNotifications = useCallback(() => {
    Alert.alert("Thông báo", "Cài đặt thông báo sẽ được cập nhật.");
  }, []);

  const handleSettings = useCallback(() => {
    Alert.alert("Cài đặt", "Cài đặt hồ sơ sẽ được cập nhật.");
  }, []);

  const handleMessage = useCallback(() => {
    // Navigate to chat with this user
    if (userId) {
      router.push(`/chat/${userId}`);
    }
  }, [userId]);

  const handleReportPress = useCallback(() => {
    setIsReportModalOpen(true);
  }, []);

  const handleReportSubmit = useCallback(
    (reason: string) => {
      reportUser(
        { userId: String(userId), reason },
        {
          onSuccess: () => {
            setIsReportModalOpen(false);
          },
          onError: () => {
            setIsReportModalOpen(false);
          },
        }
      );
    },
    [userId, reportUser]
  );

  const handleMenuPress = useCallback((postId: string) => {
    console.log("Post menu pressed:", postId);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ProfilePost }) => (
      <ProfilePostCard post={item} onMenuPress={handleMenuPress} />
    ),
    [handleMenuPress],
  );

  const keyExtractor = useCallback((item: ProfilePost) => item.id, []);

  if (isProfileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.appBar,
            { paddingTop: insets.top, borderBottomColor: colors.borderLight },
          ]}
        >
          <Pressable
            style={styles.iconButton}
            onPress={handleBack}
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (profileError || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.appBar,
            { paddingTop: insets.top, borderBottomColor: colors.borderLight },
          ]}
        >
          <Pressable
            style={styles.iconButton}
            onPress={handleBack}
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Không thể tải hồ sơ
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.appBar,
          {
            paddingTop: insets.top,
            borderBottomColor: colors.borderLight,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          style={styles.iconButton}
          onPress={handleBack}
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.appBarSpacer} />

        <View style={styles.appBarActions}>
          <Pressable
            style={styles.iconButton}
            onPress={handleSearch}
            accessibilityLabel="Tìm kiếm"
            accessibilityRole="button"
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={handleNotifications}
            accessibilityLabel="Thông báo"
            accessibilityRole="button"
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text}
            />
            <View style={[styles.badgeDot, { backgroundColor: colors.info }]} />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={handleSettings}
            accessibilityLabel="Cài đặt"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
        ListHeaderComponent={
          <View>
            <PublicProfileHeader
              profile={profile}
              onMessagePress={handleMessage}
              onReportPress={handleReportPress}
              isOwnProfile={isOwnProfile}
            />
            <PublicProfileTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isOwnProfile={isOwnProfile}
            />
          </View>
        }
        ListEmptyComponent={
          isPostsLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.centerContent}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Chưa có bài viết
              </Text>
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Report User Modal */}
      <ReportModal
        visible={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        targetType="user"
        isLoading={isReporting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  appBarSpacer: {
    flex: 1,
  },
  appBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  badgeDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    textAlign: "center",
  },
  errorText: {
    fontSize: Typography.sizes.md,
    textAlign: "center",
  },
});
