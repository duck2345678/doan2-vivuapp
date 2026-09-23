/**
 * AddMemberBottomSheet Component
 * Bottom sheet for adding members to a group chat
 * Matches Figma node 317:3862
 */
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
    type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spinner } from '@/shared/components/ui';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { showErrorToast, showSuccessToast } from '@/shared/utils';

import { useAddChannelMembers, useSearchUsers } from '../hooks';
import type { UserPreview } from '../types';
import { SelectableUserRow } from './SelectableUserRow';
import { SelectedMemberChip } from './SelectedMemberChip';

export interface AddMemberBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface AddMemberBottomSheetProps {
  channelId?: number;
  threadId: string;
  groupName: string;
  onMembersAdded?: (users: UserPreview[]) => void;
}

/**
 * Bottom sheet for adding members to group chat
 */
export const AddMemberBottomSheet = forwardRef<
  AddMemberBottomSheetRef,
  AddMemberBottomSheetProps
>(function AddMemberBottomSheet({ channelId, threadId, groupName, onMembersAdded }, ref) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserPreview[]>([]);

  // Hooks
  const { data: suggestedUsers = [], isLoading: isLoadingUsers } =
    useSearchUsers(searchQuery);
  const { mutate: addChannelMembers, isPending: isAdding } = useAddChannelMembers();

  // Snap points: 75% height
  const snapPoints = useMemo(() => ['75%'], []);

  // Expose open/close methods
  useImperativeHandle(ref, () => ({
    open: () => {
      bottomSheetRef.current?.expand();
    },
    close: () => {
      bottomSheetRef.current?.close();
      // Reset state on close
      setSearchQuery('');
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
    []
  );

  // Handlers
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleToggleUser = useCallback((user: UserPreview) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  }, []);

  const handleRemoveUser = useCallback((userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleAddMembers = useCallback(() => {
    if (selectedUsers.length === 0 || !channelId) return;

    addChannelMembers(
      { 
        channelId, 
        data: { userIds: selectedUsers.map(u => u.id) } 
      },
      {
        onSuccess: () => {
          const memberNames = selectedUsers.map(u => u.displayName).join(', ');
          showSuccessToast(`Đã thêm ${memberNames} vào nhóm`);
          onMembersAdded?.(selectedUsers);
          handleClose();
        },
        onError: (error) => {
          console.error('Failed to add members:', error);
          showErrorToast('Không thể thêm thành viên. Vui lòng thử lại.');
        },
      }
    );
  }, [addChannelMembers, channelId, selectedUsers, onMembersAdded, handleClose]);

  // Button text
  const buttonText =
    selectedUsers.length === 0
      ? 'Chọn thành viên'
      : `Thêm ${selectedUsers.length} thành viên`;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.card ?? '#ffffff' }}
      handleIndicatorStyle={{ backgroundColor: colors.border ?? '#e2e8f0', width: 40 }}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Thêm thành viên
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {groupName}
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

        {/* Selected members chips */}
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
                user={user}
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
              placeholder="Tìm kiếm theo số điện thoại..."
              placeholderTextColor={colors.separatorDot}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
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
          Gợi ý
        </Text>

        {/* User list */}
        <BottomSheetScrollView
          style={styles.userList}
          showsVerticalScrollIndicator={false}
        >
          {isLoadingUsers ? (
            <View style={styles.loadingContainer}>
              <Spinner size="md" />
            </View>
          ) : (
            suggestedUsers.map((user) => (
              <SelectableUserRow
                key={user.id}
                user={user}
                isSelected={selectedUsers.some((u) => u.id === user.id)}
                onToggle={handleToggleUser}
              />
            ))
          )}
        </BottomSheetScrollView>

        {/* Add button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[
              styles.addButton,
              {
                backgroundColor:
                  selectedUsers.length > 0 && channelId ? colors.fabBlue : colors.chipBackground,
              },
            ]}
            onPress={handleAddMembers}
            disabled={selectedUsers.length === 0 || isAdding || !channelId}
          >
            {isAdding ? (
              <Spinner size="sm" />
            ) : (
              <Text
                style={[
                  styles.addButtonText,
                  {
                    color:
                      selectedUsers.length > 0 ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}
              >
                {buttonText}
              </Text>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    height: '100%',
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
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  addButton: {
    height: 48,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
