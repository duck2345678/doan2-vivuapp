/**
 * ProfileUnsaveMenu Component
 * Simple bottom sheet menu for unsaving posts in favorites tab
 */

import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";

interface ProfileUnsaveMenuProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onUnsave: (postId: string) => void;
}

export function ProfileUnsaveMenu({
  isOpen,
  onClose,
  postId,
  onUnsave,
}: ProfileUnsaveMenuProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => [120], []);

  const handleUnsave = useCallback(() => {
    onUnsave(postId);
    onClose();
  }, [postId, onUnsave, onClose]);

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
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleUnsave}
          activeOpacity={0.7}
        >
          <Ionicons
            name="bookmark-outline"
            size={22}
            color={colors.textPrimary}
          />
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            Bỏ lưu bài viết
          </Text>
        </TouchableOpacity>
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
});
