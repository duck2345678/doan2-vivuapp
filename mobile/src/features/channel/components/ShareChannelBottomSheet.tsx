/**
 * ShareChannelBottomSheet Component
 * Bottom sheet for selecting recipients to share channel invite
 * Reuses patterns from AddMemberBottomSheet.tsx
 */
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
    type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth/store/authStore";
import { conversationsApi } from "@/features/chat/api";
import type { UserSearchResult } from "@/features/chat/api/users.api";
import { MemberSelectRow } from "@/features/chat/components/MemberSelectRow";
import { SelectedMemberChip } from "@/features/chat/components/SelectedMemberChip";
import {
    useChannelMembers,
    useFriends,
    useSearchUsers,
    useSendMessageHybrid,
} from "@/features/chat/hooks";
import type { FriendPreview } from "@/features/chat/types/channel.types";
import { Spinner } from "@/shared/components/ui";
import { Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { showErrorToast, showSuccessToast } from "@/shared/utils";
import type { ChannelInvitePayload } from "../types";

/**
 * Unified user type for display in the list
 * Normalizes both FriendPreview and UserSearchResult
 */
interface DisplayUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isOnline?: boolean;
  statusText?: string;
}

export interface ShareChannelBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface ShareChannelBottomSheetProps {
  /** Numeric channel ID for member check */
  channelId?: number;
  /** Channel invite payload to share */
  invitePayload: ChannelInvitePayload;
  /** Callback when sharing completes */
  onShareComplete?: (recipientCount: number) => void;
}

/**
 * Bottom sheet for sharing channel invite to friends
 */
export const ShareChannelBottomSheet = forwardRef<
  ShareChannelBottomSheetRef,
  ShareChannelBottomSheetProps
>(function ShareChannelBottomSheet(
  { channelId, invitePayload, onShareComplete },
  ref,
) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const user = useAuthStore((state) => state.user);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<DisplayUser[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Hooks
  const { data: friends = [], isLoading: isLoadingFriends } =
    useFriends(searchQuery);
  const { data: searchResults = [], isLoading: isLoadingSearch } =
    useSearchUsers(searchQuery);
  const { data: channelMembers = [] } = useChannelMembers(channelId);
  const { sendMessage } = useSendMessageHybrid();

  /**
   * Convert FriendPreview to DisplayUser
   */
  const friendToDisplayUser = useCallback(
    (friend: FriendPreview): DisplayUser => ({
      id: friend.id,
      displayName: friend.displayName,
      avatarUrl: friend.avatarUrl,
      isOnline: friend.isOnline,
      statusText: friend.statusText,
    }),
    [],
  );

  /**
   * Convert UserSearchResult to DisplayUser
   */
  const searchResultToDisplayUser = useCallback(
    (result: UserSearchResult): DisplayUser => ({
      id: result.id.toString(),
      displayName: result.displayName,
      avatarUrl: result.avatarUrl,
      isOnline: undefined,
      statusText: undefined,
    }),
    [],
  );

  // Get member IDs for filtering
  const memberIds = useMemo(() => {
    return new Set(channelMembers.map((m: any) => m.userId?.toString()));
  }, [channelMembers]);

  // Combine friends and search results, filter out existing members
  const availableUsers = useMemo((): DisplayUser[] => {
    // Convert to unified DisplayUser type based on search state
    const users: DisplayUser[] =
      searchQuery.length >= 2
        ? searchResults.map(searchResultToDisplayUser)
        : friends.map(friendToDisplayUser);
    // Filter out users who are already channel members
    return users.filter((u: DisplayUser) => !memberIds.has(u.id));
  }, [
    searchQuery,
    searchResults,
    friends,
    memberIds,
    friendToDisplayUser,
    searchResultToDisplayUser,
  ]);

  const isLoading =
    searchQuery.length >= 2 ? isLoadingSearch : isLoadingFriends;

  // Snap points: 75% height
  const snapPoints = useMemo(() => ["75%"], []);

  // Expose open/close methods
  useImperativeHandle(ref, () => ({
    open: () => {
      bottomSheetRef.current?.expand();
    },
    close: () => {
      bottomSheetRef.current?.close();
      // Reset state on close
      setSearchQuery("");
      setSelectedUsers([]);
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

  // Handlers
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleToggleUser = useCallback((displayUser: DisplayUser) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === displayUser.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== displayUser.id);
      }
      return [...prev, displayUser];
    });
  }, []);

  const handleRemoveUser = useCallback((userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId.toString()));
  }, []);

  const handleShare = useCallback(async () => {
    if (selectedUsers.length === 0 || !user) return;

    setIsSending(true);

    try {
      // Build invite message content with metadata marker
      const messageContent = `🎉 ${user.displayName || "Ai đó"} đã mời bạn tham gia channel "${invitePayload.name}"!\n\n[CHANNEL_INVITE:${JSON.stringify(invitePayload)}]`;

      let successCount = 0;
      let failCount = 0;

      // Send invite to each selected user
      for (const recipient of selectedUsers) {
        try {
          // Get or create DM conversation
          const dmResponse = await conversationsApi.getOrCreateDirect(
            Number(recipient.id),
          );
          const conversationId = dmResponse.result.conversationId;

          // Send the invite message
          await sendMessage({
            threadId: conversationId,
            text: messageContent,
            senderInfo: {
              id: user.id,
              displayName: user.displayName || "",
              avatarUrl: user.avatarUrl,
            },
          });

          successCount++;
        } catch (error) {
          console.error(
            `Failed to send invite to ${recipient.displayName}:`,
            error,
          );
          failCount++;
        }
      }

      if (successCount > 0) {
        showSuccessToast(`Đã gửi lời mời đến ${successCount} người`);
        onShareComplete?.(successCount);
        handleClose();
      }

      if (failCount > 0 && successCount === 0) {
        showErrorToast("Không thể gửi lời mời. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Share failed:", error);
      showErrorToast("Không thể gửi lời mời. Vui lòng thử lại.");
    } finally {
      setIsSending(false);
    }
  }, [
    selectedUsers,
    user,
    invitePayload,
    sendMessage,
    onShareComplete,
    handleClose,
  ]);

  // Button text
  const buttonText =
    selectedUsers.length === 0
      ? "Chọn người nhận"
      : `Gửi đến ${selectedUsers.length} người`;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.card ?? "#ffffff" }}
      handleIndicatorStyle={{
        backgroundColor: colors.border ?? "#e2e8f0",
        width: 40,
      }}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Chia sẻ kênh
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {invitePayload.name}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Đóng"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Selected users chips */}
        {selectedUsers.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsContainer}
            contentContainerStyle={styles.chipsContent}
          >
            {selectedUsers.map((user) => (
              <SelectedMemberChip
                key={user.id}
                user={{
                  id: Number(user.id),
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                }}
                onRemove={handleRemoveUser}
              />
            ))}
          </ScrollView>
        )}

        {/* Search input */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: colors.chipBackground },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Tìm bạn bè..."
              placeholderTextColor={colors.separatorDot}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {searchQuery.length >= 2 ? "Kết quả tìm kiếm" : "Bạn bè"}
        </Text>

        {/* User list */}
        <BottomSheetScrollView
          style={styles.userList}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Spinner size="md" />
            </View>
          ) : availableUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery.length >= 2
                  ? "Không tìm thấy người dùng"
                  : "Không có bạn bè để chia sẻ"}
              </Text>
            </View>
          ) : (
            availableUsers.map((user) => (
              <MemberSelectRow
                key={user.id}
                friend={user}
                isSelected={selectedUsers.some((u) => u.id === user.id)}
                onToggle={handleToggleUser}
              />
            ))
          )}
        </BottomSheetScrollView>

        {/* Share button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[
              styles.shareButton,
              {
                backgroundColor:
                  selectedUsers.length > 0
                    ? colors.fabBlue
                    : colors.chipBackground,
              },
            ]}
            onPress={handleShare}
            disabled={selectedUsers.length === 0 || isSending}
          >
            {isSending ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Ionicons
                  name="paper-plane"
                  size={18}
                  color={
                    selectedUsers.length > 0 ? "#FFFFFF" : colors.textSecondary
                  }
                  style={styles.buttonIcon}
                />
                <Text
                  style={[
                    styles.shareButtonText,
                    {
                      color:
                        selectedUsers.length > 0
                          ? "#FFFFFF"
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {buttonText}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: Typography.weights.normal,
    lineHeight: 20,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -4,
  },
  chipsContainer: {
    maxHeight: 50,
    marginBottom: Spacing.sm,
  },
  chipsContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    height: 44,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    height: "100%",
  },
  clearButton: {
    marginLeft: Spacing.xs,
  },
  sectionLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  userList: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: Typography.sizes.base,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  shareButton: {
    height: 48,
    borderRadius: 9999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonIcon: {
    marginRight: Spacing.xs,
  },
  shareButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
