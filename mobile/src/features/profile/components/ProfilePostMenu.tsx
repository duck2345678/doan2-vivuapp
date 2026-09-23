import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import type { ProfileTabKey } from "./ProfileTabs";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  variant?: "default" | "danger";
  onPress: () => void;
}

interface ProfilePostMenuProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  tabType: ProfileTabKey;
  onUnsave?: (postId: string) => void;
  onSave?: (postId: string) => void;
  onEditPrivacy?: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

/**
 * Bottom sheet menu for profile post actions
 * - "favorites" tab: Bỏ lưu bài viết
 * - "my-posts" tab: Chỉnh sửa, Chia sẻ, Xóa
 */
export function ProfilePostMenu({
  isOpen,
  onClose,
  postId,
  tabType,
  onUnsave,
  onSave,
  onEditPrivacy,
  onEdit,
  onDelete,
  onShare,
}: ProfilePostMenuProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const bottomSheetRef = useRef<BottomSheet>(null);

  const menuItems: MenuItem[] = useMemo(() => {
    if (tabType === "favorites") {
      return [
        {
          id: "unsave",
          label: "Bỏ lưu bài viết",
          icon: "bookmark-remove",
          onPress: () => {
            onUnsave?.(postId);
            onClose();
          },
        },
      ];
    }

    // my-posts tab - match CommunityScreen options
    return [
      {
        id: "save",
        label: "Lưu bài viết",
        icon: "bookmark-border",
        onPress: () => {
          onSave?.(postId);
          onClose();
        },
      },
      {
        id: "editPrivacy",
        label: "Chỉnh sửa quyền riêng tư",
        icon: "lock",
        onPress: () => {
          onEditPrivacy?.(postId);
          onClose();
        },
      },
      {
        id: "edit",
        label: "Chỉnh sửa bài viết",
        icon: "edit",
        onPress: () => {
          onEdit?.(postId);
          onClose();
        },
      },
      {
        id: "delete",
        label: "Chuyển vào thùng rác",
        icon: "delete",
        variant: "danger",
        onPress: () => {
          onDelete?.(postId);
          onClose();
        },
      },
    ];
  }, [
    postId,
    tabType,
    onUnsave,
    onSave,
    onEditPrivacy,
    onEdit,
    onDelete,
    onShare,
    onClose,
  ]);

  const snapPoints = useMemo(
    () => [tabType === "favorites" ? 120 : 280],
    [tabType]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  React.useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleSheetChanges}
      backgroundStyle={[
        styles.sheetBackground,
        { backgroundColor: colors.card ?? "#ffffff" },
      ]}
      handleIndicatorStyle={[
        styles.handleIndicator,
        { backgroundColor: colors.border ?? "#e2e8f0" },
      ]}
    >
      <BottomSheetView style={styles.contentContainer}>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={item.icon as any}
                size={20}
                color={
                  item.variant === "danger" ? colors.error : colors.textPrimary
                }
              />
              <Text
                style={[
                  styles.menuItemText,
                  {
                    color:
                      item.variant === "danger"
                        ? colors.error
                        : colors.textPrimary,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
            {index < menuItems.length - 1 && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.chipBackground },
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  handleIndicator: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.screenPadding,
    gap: 12,
  },
  menuItemText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
  },
});
