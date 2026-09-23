/**
 * ChannelJoinModal Component
 * Bottom sheet modal for joining a channel from invite
 */
import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
    type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJoinByInviteCode } from "@/features/chat/hooks";
import { Spinner } from "@/shared/components/ui";
import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { showErrorToast, showSuccessToast } from "@/shared/utils";
import type { ChannelInvitePayload } from "../types";

export interface ChannelJoinModalRef {
  open: (payload: ChannelInvitePayload) => void;
  close: () => void;
}

interface ChannelJoinModalProps {
  /** Callback when join succeeds */
  onJoinSuccess?: (conversationId: string) => void;
  /** Callback when modal closes */
  onClose?: () => void;
}

/**
 * Modal for previewing and joining a channel from invite
 */
export const ChannelJoinModal = forwardRef<
  ChannelJoinModalRef,
  ChannelJoinModalProps
>(function ChannelJoinModal({ onJoinSuccess, onClose }, ref) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // State
  const [invitePayload, setInvitePayload] =
    useState<ChannelInvitePayload | null>(null);

  // Hooks
  const { mutate: joinByInviteCode, isPending: isJoining } =
    useJoinByInviteCode();

  // Snap points
  const snapPoints = useMemo(() => ["50%"], []);

  // Expose open/close methods
  useImperativeHandle(ref, () => ({
    open: (payload: ChannelInvitePayload) => {
      setInvitePayload(payload);
      bottomSheetRef.current?.expand();
    },
    close: () => {
      bottomSheetRef.current?.close();
    },
  }));

  // Backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose?.();
  }, [onClose]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        setInvitePayload(null);
        onClose?.();
      }
    },
    [onClose],
  );

  const handleJoin = useCallback(() => {
    if (!invitePayload?.inviteCode) {
      showErrorToast("Link mời không hợp lệ");
      return;
    }

    joinByInviteCode(invitePayload.inviteCode, {
      onSuccess: (response: any) => {
        showSuccessToast(`Đã tham gia ${invitePayload.name}`);
        handleClose();

        const conversationId =
          response?.result?.conversationId || invitePayload.conversationId;
        if (conversationId) {
          onJoinSuccess?.(conversationId);
          // Navigate to channel chat
          router.push({
            pathname: "/channel/[channelId]",
            params: { channelId: conversationId },
          } as any);
        }
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || error?.message || "";
        const errorCode = error?.response?.data?.errorCode;
        const lowerMessage = message.toLowerCase();

        // Handle "already a member" case - navigate to channel instead of showing error
        const isAlreadyMember =
          lowerMessage.includes("already a member") ||
          lowerMessage.includes("already") ||
          message.includes("đã tham gia") ||
          message.includes("đã là thành viên") ||
          (errorCode === "FORBIDDEN" && lowerMessage.includes("member"));

        if (isAlreadyMember) {
          showSuccessToast("Bạn đã là thành viên của kênh này");
          handleClose();

          // Navigate to the channel - use conversationId or channelId as fallback
          const targetId =
            invitePayload?.conversationId || invitePayload?.channelId;
          if (targetId) {
            onJoinSuccess?.(targetId);
            router.push({
              pathname: "/channel/[channelId]",
              params: { channelId: targetId },
            } as any);
          }
          return;
        }

        if (message?.includes("pending") || message?.includes("chờ duyệt")) {
          showErrorToast("Yêu cầu tham gia đang chờ duyệt");
        } else if (
          message?.includes("invalid") ||
          message?.includes("expired")
        ) {
          showErrorToast("Link mời không hợp lệ hoặc đã hết hạn");
        } else {
          showErrorToast("Không thể tham gia kênh. Vui lòng thử lại.");
        }
      },
    });
  }, [invitePayload, joinByInviteCode, handleClose, onJoinSuccess, router]);

  if (!invitePayload) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: colors.card ?? "#ffffff" }}
      handleIndicatorStyle={{
        backgroundColor: colors.border ?? "#e2e8f0",
        width: 40,
      }}
    >
      <BottomSheetView
        style={[styles.container, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Lời mời tham gia kênh
          </Text>
        </View>

        {/* Channel Preview Card */}
        <View
          style={[
            styles.previewCard,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          {/* Gradient Icon */}
          <LinearGradient
            colors={["#a855f7", "#6366f1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconTile}
          >
            {invitePayload.emoji ? (
              <Text style={styles.emojiIcon}>{invitePayload.emoji}</Text>
            ) : (
              <MaterialIcons name="groups" size={36} color="#ffffff" />
            )}
          </LinearGradient>

          {/* Channel Name */}
          <Text
            style={[styles.channelName, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {invitePayload.name}
          </Text>

          {/* Description */}
          {invitePayload.description && (
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={3}
            >
              {invitePayload.description}
            </Text>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statBadge, { backgroundColor: colors.card }]}>
              <MaterialIcons name="people" size={16} color="#a855f7" />
              <Text style={[styles.statText, { color: colors.textPrimary }]}>
                {invitePayload.memberCount?.toLocaleString() || 0} thành viên
              </Text>
            </View>
          </View>

          {/* Inviter Info */}
          {invitePayload.inviterName && (
            <View style={styles.inviterRow}>
              <MaterialIcons
                name="person"
                size={14}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.inviterText, { color: colors.textSecondary }]}
              >
                Được mời bởi{" "}
                <Text style={styles.inviterName}>
                  {invitePayload.inviterName}
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* Cancel Button */}
          <TouchableOpacity
            style={[
              styles.cancelButton,
              { backgroundColor: colors.backgroundSecondary },
            ]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Huỷ
            </Text>
          </TouchableOpacity>

          {/* Join Button */}
          <TouchableOpacity
            style={styles.joinButtonWrapper}
            onPress={handleJoin}
            activeOpacity={0.8}
            disabled={isJoining}
          >
            <LinearGradient
              colors={["#a855f7", "#6366f1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinButton}
            >
              {isJoining ? (
                <Spinner size="sm" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="login" size={20} color="#ffffff" />
                  <Text style={styles.joinText}>Tham gia ngay</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  previewCard: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emojiIcon: {
    fontSize: 36,
  },
  channelName: {
    fontSize: Typography.sizes["2xl"],
    fontWeight: Typography.weights.bold,
    textAlign: "center",
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  description: {
    fontSize: Typography.sizes.base,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    gap: Spacing.xs,
  },
  statText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  inviterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  inviterText: {
    fontSize: Typography.sizes.sm,
  },
  inviterName: {
    fontWeight: Typography.weights.semibold,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 0.4,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.xl,
  },
  cancelText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  joinButtonWrapper: {
    flex: 0.6,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    gap: Spacing.sm,
  },
  joinText: {
    color: "#ffffff",
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});
