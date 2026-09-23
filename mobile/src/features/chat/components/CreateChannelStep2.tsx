/**
 * CreateChannelStep2 Component
 * Second step of channel creation: add members / select friends
 * Matches Figma node 499:1729
 */
import { MaterialIcons } from "@expo/vector-icons";
import {
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import React, { type ComponentType, useState } from "react";
import {
  FlatList as RNFlatList,
  TextInput as RNTextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Spinner } from "@/shared/components/ui";
import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme, useDebounce } from "@/shared/hooks";

import { useSearchUsers } from "../hooks/useSearchUsers";
import type { FriendPreview } from "../types/channel.types";
import { MemberSelectRow, type SelectableUser } from "./MemberSelectRow";
import { StepIndicator } from "./StepIndicator";

/** Footer height constant */
const FOOTER_HEIGHT = 72;

interface CreateChannelStep2Props {
  selectedMembers: FriendPreview[];
  onSelectedMembersChange: (members: FriendPreview[]) => void;
  onBack: () => void;
  onCreate: () => void;
  isCreating: boolean;
  /** Custom ScrollView component - if provided, use BottomSheetFlatList */
  ScrollComponent?: ComponentType<any>;
  /** Whether inside a BottomSheet - uses BottomSheetTextInput */
  useBottomSheet?: boolean;
  /** Bottom safe area inset */
  bottomInset?: number;
}

/**
 * Step 2 form for channel creation - member selection
 */
export function CreateChannelStep2({
  selectedMembers,
  onSelectedMembersChange,
  onBack,
  onCreate,
  isCreating,
  ScrollComponent,
  useBottomSheet = false,
  bottomInset = 0,
}: CreateChannelStep2Props) {
  // Use BottomSheet components when inside bottom sheet
  const FlatList = ScrollComponent ? BottomSheetFlatList : RNFlatList;
  const TextInput = useBottomSheet ? BottomSheetTextInput : RNTextInput;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  // Calculate total footer height including safe area
  const totalFooterHeight = FOOTER_HEIGHT + bottomInset;

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: users = [], isLoading } = useSearchUsers(debouncedSearch);

  // Convert users to selectable user format
  const selectableUsers: SelectableUser[] = users.map((user) => ({
    id: user.id.toString(),
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isOnline: undefined,
    statusText: undefined,
  }));

  const handleToggleMember = (selectableUser: SelectableUser) => {
    const isSelected = selectedMembers.some((m) => m.id === selectableUser.id);
    // Convert SelectableUser back to FriendPreview for state
    const asFriendPreview: FriendPreview = {
      id: selectableUser.id,
      displayName: selectableUser.displayName,
      avatarUrl: selectableUser.avatarUrl,
      isOnline: selectableUser.isOnline ?? false,
      statusText: selectableUser.statusText ?? "",
    };
    if (isSelected) {
      onSelectedMembersChange(
        selectedMembers.filter((m) => m.id !== selectableUser.id),
      );
    } else {
      onSelectedMembersChange([...selectedMembers, asFriendPreview]);
    }
  };

  const isSelected = (friendId: string) =>
    selectedMembers.some((m) => m.id === friendId);

  const renderFriend = ({ item }: { item: SelectableUser }) => (
    <MemberSelectRow
      friend={item}
      isSelected={isSelected(item.id)}
      onToggle={handleToggleMember}
    />
  );

  const keyExtractor = (item: SelectableUser) => item.id;

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <StepIndicator currentStep={2} />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm kiếm bạn bè..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Selected count indicator */}
      {selectedMembers.length > 0 && (
        <View style={styles.selectedCountContainer}>
          <Text style={[styles.selectedCountText, { color: colors.fabBlue }]}>
            Đã chọn {selectedMembers.length} người
          </Text>
        </View>
      )}

      {/* Friends List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      ) : (
        <FlatList
          data={selectableUsers}
          renderItem={renderFriend}
          keyExtractor={keyExtractor}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: totalFooterHeight + Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery
                  ? "Không tìm thấy bạn bè"
                  : "Bạn chưa có bạn bè nào"}
              </Text>
            </View>
          }
        />
      )}

      {/* Footer Buttons - Absolute positioned */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background ?? "#ffffff",
            paddingBottom: bottomInset + Spacing.md,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            styles.backButton,
            { backgroundColor: colors.chipBackground ?? "#f3f4f6" },
          ]}
          onPress={onBack}
          activeOpacity={0.8}
          disabled={isCreating}
        >
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
            Quay lại
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            {
              backgroundColor: colors.actionBlue,
              opacity: isCreating ? 0.7 : 1,
            },
          ]}
          onPress={onCreate}
          activeOpacity={0.8}
          disabled={isCreating}
        >
          {isCreating ? (
            <Spinner size="sm" />
          ) : (
            <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
              Tạo Channel
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  selectedCountContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.sm,
  },
  selectedCountText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {},
  primaryButton: {},
  buttonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
