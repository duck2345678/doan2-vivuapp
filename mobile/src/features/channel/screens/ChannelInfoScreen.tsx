/**
 * ChannelInfoScreen
 * Displays channel/group information matching Figma design
 */

import { queryKeys } from "@/config/queryKeys";
import { websocketService } from "@/lib/websocket";
import type { WebSocketMessage } from "@/lib/websocket/types";
import type { ChannelResponse } from "@/shared/types/backend.types";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { channelQueryKeys } from "../hooks/channelQueryKeys";

import { useAuthStore } from "@/features/auth/store/authStore";
import { useRegenerateInviteCode } from "@/features/chat/hooks/useChannels";
import { AvatarRow } from "@/shared/components/avatar";
import {
    EmptyState,
    ErrorMessage,
    LoadingScreen,
} from "@/shared/components/feedback";
import { Button } from "@/shared/components/ui";
import {
    BorderRadius,
    Colors,
    Shadows,
    Spacing,
    Typography,
} from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { showErrorToast, showSuccessToast } from "@/shared/utils";
import {
    ShareChannelBottomSheet,
    type ShareChannelBottomSheetRef,
} from "../components";
import { useChannelInfo, useJoinChannel, useLeaveChannel } from "../hooks";
import type { ChannelInvitePayload } from "../types";

/**
 * Group/Channel Info screen matching Figma NODE 321-5121
 */
export function ChannelInfoScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const params = useLocalSearchParams<{ channelId?: string | string[] }>();
  const channelId = Array.isArray(params.channelId)
    ? params.channelId[0]
    : params.channelId;

  const {
    data: channelInfo,
    isLoading,
    isError,
    refetch,
  } = useChannelInfo(channelId || "");
  const joinChannelMutation = useJoinChannel();
  const leaveChannelMutation = useLeaveChannel();
  const { mutate: regenerateInvite, isPending: isRegenerating } =
    useRegenerateInviteCode();
  const queryClient = useQueryClient();

  // Bottom sheet ref for sharing
  const shareBottomSheetRef = useRef<ShareChannelBottomSheetRef>(null);

  // WebSocket Subscription for Channel Updates (including multi-device sync for leave)
  React.useEffect(() => {
    if (!channelInfo?.id) return;

    console.log(
      `[ChannelInfo] Subscribing to channel updates: ${channelInfo.id}`,
    );

    const subscription = websocketService.subscribeToChannel(
      channelInfo.id,
      (message: WebSocketMessage<ChannelResponse>) => {
        if (message.eventType === "CHANNEL_CHANGED") {
          console.log(
            "[ChannelInfo] Received CHANNEL_CHANGED event",
            message.data,
          );

          const response = message.data;

          // Multi-device sync: If user is no longer a member, navigate away
          if (response && response.isJoined === false) {
            console.log(
              "[ChannelInfo] User is no longer a member, navigating away",
            );
            queryClient.invalidateQueries({
              queryKey: queryKeys.conversations.all,
            });
            router.replace("/(tabs)/community");
            return;
          }

          // Invalidate query to refetch fresh data
          queryClient.invalidateQueries({
            queryKey: channelQueryKeys.info(channelId || channelInfo.id),
          });

          // Also refetch explicitly to be sure
          refetch();
        }
      },
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [channelInfo?.id, queryClient, refetch, channelId, router]);

  const [showInviteSection, setShowInviteSection] = useState(false);

  const getInviteLink = useCallback(() => {
    if (!channelInfo?.inviteCode) return "";
    // Generate a shareable link (adjust domain as needed)
    return `https://univillage.app/channel/invite/${channelInfo.inviteCode}`;
  }, [channelInfo?.inviteCode]);

  const handleCopyInviteLink = useCallback(async () => {
    const link = getInviteLink();
    if (!link) {
      showErrorToast("Không có link mời");
      return;
    }
    await Clipboard.setStringAsync(link);
    showSuccessToast("Đã sao chép link mời");
  }, [getInviteLink]);

  // Build invite payload for sharing
  const getInvitePayload = useCallback((): ChannelInvitePayload | null => {
    if (!channelInfo || !channelInfo.inviteCode) return null;
    return {
      channelId: channelInfo.channelId?.toString() || channelInfo.id,
      conversationId: channelInfo.id,
      inviteCode: channelInfo.inviteCode,
      name: channelInfo.name,
      emoji: channelInfo.emoji,
      description: channelInfo.description,
      memberCount: channelInfo.memberCount,
      avatarUrl: channelInfo.iconUrl,
      inviterName: user?.displayName || "Ai đó",
    };
  }, [channelInfo, user]);

  // Open share bottom sheet to select recipients
  const handleShareInviteLink = useCallback(() => {
    if (!channelInfo?.inviteCode) {
      showErrorToast("Không có link mời");
      return;
    }
    shareBottomSheetRef.current?.open();
  }, [channelInfo]);

  // Fallback to system share (for copy link action or external sharing)
  const handleSystemShare = useCallback(async () => {
    const link = getInviteLink();
    if (!link || !channelInfo) return;
    try {
      await Share.share({
        message: `Tham gia channel "${channelInfo.name}" trên UniVillage!\n${link}`,
        title: `Mời bạn tham gia ${channelInfo.name}`,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  }, [getInviteLink, channelInfo]);

  const handleRegenerateInvite = useCallback(() => {
    if (!channelInfo?.channelId || isRegenerating) return;
    Alert.alert(
      "Tạo link mời mới",
      "Link mời cũ sẽ không còn hoạt động. Bạn có chắc chắn?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Tạo mới",
          onPress: () => {
            regenerateInvite(channelInfo.channelId!, {
              onSuccess: () => {
                showSuccessToast("Đã tạo link mời mới");
                refetch();
              },
              onError: () => {
                showErrorToast("Không thể tạo link mời mới");
              },
            });
          },
        },
      ],
    );
  }, [channelInfo?.channelId, isRegenerating, regenerateInvite, refetch]);

  const handleLeaveChannel = () => {
    if (!channelInfo?.id) return;

    Alert.alert("Rời nhóm", "Bạn có chắc chắn muốn rời khỏi nhóm này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: () => {
          leaveChannelMutation.mutate(
            {
              conversationId: channelInfo.id,
              cacheKey: channelId || channelInfo.id,
            },
            {
              onSuccess: () => {
                // Invalidate conversations list and navigate away
                queryClient.invalidateQueries({
                  queryKey: queryKeys.conversations.all,
                });
                router.replace("/(tabs)/community");
              },
            },
          );
        },
      },
    ]);
  };

  const handleBack = () => {
    router.back();
  };

  const handleJoinChat = () => {
    if (!channelInfo) return;
    if (!channelInfo.id) {
      showErrorToast("Missing channel conversation id.");
      return;
    }
    const cacheKey = channelId || channelInfo.id;

    if (channelInfo.isJoined) {
      // Navigate to channel thread
      router.push({
        pathname: "/channel/[channelId]",
        params: { channelId: channelInfo.id },
      } as any);
    } else {
      // Join then navigate
      joinChannelMutation.mutate(
        { conversationId: channelInfo.id, cacheKey },
        {
          onSuccess: (data) => {
            const accepted = !data?.status || data.status === "ACCEPTED";
            if (!accepted) return;
            router.push({
              pathname: "/channel/[channelId]",
              params: { channelId: channelInfo.id },
            } as any);
          },
        },
      );
    }
  };

  const handleCreatorPress = () => {
    // Navigate to creator profile (stub)
    console.log("Navigate to creator profile:", channelInfo?.creator.id);
  };

  if (!channelId) {
    return (
      <EmptyState
        title="Channel not found"
        message="Missing channel identifier."
        actionLabel="Go back"
        onAction={handleBack}
      />
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading channel info..." />;
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Unable to load channel"
        message="Please try again."
        onRetry={refetch}
      />
    );
  }

  if (!channelInfo) {
    return (
      <EmptyState
        title="Channel not found"
        message="This channel may have been removed."
        actionLabel="Go back"
        onAction={handleBack}
      />
    );
  }
  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.actionBlue }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin nhóm</Text>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleShareInviteLink}
        >
          <MaterialIcons name="share" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Old Menu Button - kept as requested or just replaced? 
            Requirement says: "Feature Refactor: Gỡ bỏ block 'Link mời tham gia', thay thế bằng tính năng Native Share Channel." 
            And "Header: Có một khung trắng trống phía trên tên nhóm... -> Cần xóa."
            It doesn't say "Remove menu button". 
            But typically share is an action. 
            I will replace the menu button with Share button as per standard mobile patterns for this context, 
            or add it beside it. 
            The design usually has Back - Title - Actions. 
            I'll replace the generic menu with Share for now as it's the primary action requested.
        */}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Preview Image Block */}
        {channelInfo.previewImageUrl && (
          <View style={styles.previewContainer}>
            <View
              style={[
                styles.previewCard,
                { backgroundColor: colors.card },
                Shadows.md,
              ]}
            >
              <Image
                source={{ uri: channelInfo.previewImageUrl }}
                style={styles.previewImage}
                contentFit="cover"
              />
            </View>
          </View>
        )}

        {/* Channel Title */}
        <Text style={[styles.channelTitle, { color: colors.textPrimary }]}>
          {channelInfo.emoji ? `${channelInfo.emoji} ` : ""}
          {channelInfo.name}
        </Text>

        {/* Creator */}
        <View style={styles.creatorRow}>
          <Text style={[styles.createdByText, { color: colors.textSecondary }]}>
            Tạo bởi{" "}
          </Text>
          <TouchableOpacity onPress={handleCreatorPress}>
            <Text style={[styles.creatorName, { color: colors.actionBlue }]}>
              {channelInfo.creator.displayName}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View
          style={[
            styles.descriptionContainer,
            { backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.descriptionText, { color: colors.textPrimary }]}>
            {channelInfo.description}
          </Text>
        </View>

        {/* Members Section */}
        <View
          style={[styles.membersContainer, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.membersTitle, { color: colors.textPrimary }]}>
            Thành viên ({channelInfo.memberCount.toLocaleString()})
          </Text>
          <View style={styles.membersRow}>
            <AvatarRow
              members={channelInfo.members}
              totalCount={channelInfo.memberCount}
              visibleCount={5}
              avatarSize={40}
              overlap={12}
            />
          </View>
        </View>

        {/* Invite Link Section REMOVED per requirement */}
      </ScrollView>

      {/* Footer CTA */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        {channelInfo.isJoined && (
          <Button
            title="Rời nhóm"
            variant="ghost"
            textStyle={{ color: "#ef4444" }}
            onPress={handleLeaveChannel}
            loading={leaveChannelMutation.isPending}
            disabled={leaveChannelMutation.isPending}
            style={{ marginBottom: Spacing.sm }}
          />
        )}
        <TouchableOpacity
          style={styles.ctaButtonWrapper}
          onPress={handleJoinChat}
          activeOpacity={0.8}
          disabled={joinChannelMutation.isPending}
        >
          <LinearGradient
            colors={
              channelInfo.isJoined
                ? ["#3b82f6", "#2563eb"]
                : ["#ec4899", "#f97316"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <MaterialIcons
              name={channelInfo.isJoined ? "chat" : "group-add"}
              size={22}
              color="#ffffff"
            />
            <Text style={styles.ctaText}>
              {joinChannelMutation.isPending
                ? "Đang xử lý..."
                : channelInfo.isJoined
                  ? "Vào chat"
                  : "Tham gia chat"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Share Channel Bottom Sheet */}
      {channelInfo && getInvitePayload() && (
        <ShareChannelBottomSheet
          ref={shareBottomSheetRef}
          channelId={channelInfo.channelId}
          invitePayload={getInvitePayload()!}
          onShareComplete={(count) => {
            console.log(`Shared to ${count} recipients`);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.sizes.lg, // 18px
    fontWeight: Typography.weights.semibold,
    color: "#ffffff",
    flex: 1,
    textAlign: "center",
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  previewContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  previewCard: {
    width: 200,
    height: 140,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  channelTitle: {
    fontSize: Typography.sizes["2xl"], // 24px
    fontWeight: Typography.weights.bold,
    textAlign: "center",
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  creatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  createdByText: {
    fontSize: Typography.sizes.md, // 14px
    fontWeight: Typography.weights.normal,
  },
  creatorName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  descriptionContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  descriptionText: {
    fontSize: Typography.sizes.base, // 16px
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
  },
  membersContainer: {
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  membersTitle: {
    fontSize: Typography.sizes.base, // 16px
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
  },
  membersRow: {
    alignItems: "flex-start",
  },
  // Invite link styles
  inviteContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inviteTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  inviteLinkBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  inviteLinkText: {
    fontSize: Typography.sizes.sm,
    fontFamily: "monospace",
  },
  inviteActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  inviteActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  inviteActionText: {
    color: "#FFFFFF",
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  regenerateText: {
    fontSize: Typography.sizes.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
  },
  ctaButtonWrapper: {
    borderRadius: BorderRadius.pill,
    overflow: "hidden",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: BorderRadius.pill,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: Typography.sizes.base, // 16px
    fontWeight: Typography.weights.semibold,
  },
});
