import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { OverflowMenuItem } from '../types';

interface PostOverflowMenuProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onSave: (postId: string) => void;
  onReport: (postId: string) => void;
  onBlock: (postId: string) => void;
}

/**
 * Bottom sheet menu for post actions (save, report, block)
 */
export function PostOverflowMenu({
  isOpen,
  onClose,
  postId,
  onSave,
  onReport,
  onBlock,
}: PostOverflowMenuProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => [200], []);

  const menuItems: OverflowMenuItem[] = useMemo(
    () => [
      {
        id: 'save',
        label: 'Lưu bài viết',
        icon: 'bookmark-border',
        onPress: () => {
          onSave(postId);
          onClose();
        },
      },
      {
        id: 'report',
        label: 'Báo cáo bài viết',
        icon: 'flag',
        onPress: () => {
          onReport(postId);
          onClose();
        },
      },
      {
        id: 'block',
        label: 'Chặn bài viết',
        icon: 'block',
        variant: 'danger',
        onPress: () => {
          onBlock(postId);
          onClose();
        },
      },
    ],
    [postId, onSave, onReport, onBlock, onClose]
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
        { backgroundColor: colors.card ?? '#ffffff' },
      ]}
      handleIndicatorStyle={[
        styles.handleIndicator,
        { backgroundColor: colors.border ?? '#e2e8f0' },
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
                color={item.variant === 'danger' ? colors.error : colors.textPrimary}
              />
              <Text
                style={[
                  styles.menuItemText,
                  {
                    color:
                      item.variant === 'danger'
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
                style={[styles.divider, { backgroundColor: colors.chipBackground }]}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.screenPadding,
    gap: 12,
  },
  menuItemText: {
    fontSize: Typography.sizes.base, // 16px
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
  },
});
