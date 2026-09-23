/**
 * PostOwnerMenu Component
 * Bottom sheet menu for post owner actions (save, edit privacy, edit post, delete)
 * Hiển thị khi menu được mở cho bài viết của chủ sở hữu
 */

import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface PostOwnerMenuProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    onSave: (postId: string) => void;
    onEditPrivacy?: (postId: string) => void; // Optional - only shown in post detail screen
    onEditPost: (postId: string) => void;
    onMoveToTrash: (postId: string) => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    variant?: 'default' | 'danger';
    onPress: () => void;
}

/**
 * Bottom sheet menu for post owner actions
 * Menu cho bài viết của chủ sở hữu
 */
export function PostOwnerMenu({
    isOpen,
    onClose,
    postId,
    onSave,
    onEditPrivacy,
    onEditPost,
    onMoveToTrash,
}: PostOwnerMenuProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Dynamic snap points based on whether editPrivacy is shown
    const snapPoints = useMemo(() => [onEditPrivacy ? 280 : 220], [onEditPrivacy]);

    const menuItems: MenuItem[] = useMemo(() => {
        const items: MenuItem[] = [
            {
                id: 'save',
                label: 'Lưu bài viết',
                icon: 'bookmark-outline',
                onPress: () => {
                    onSave(postId);
                    onClose();
                },
            },
        ];

        // Only add editPrivacy if the handler is provided
        if (onEditPrivacy) {
            items.push({
                id: 'editPrivacy',
                label: 'Chỉnh sửa quyền riêng tư',
                icon: 'lock-closed-outline',
                onPress: () => {
                    onEditPrivacy(postId);
                    onClose();
                },
            });
        }

        items.push(
            {
                id: 'editPost',
                label: 'Chỉnh sửa bài viết',
                icon: 'pencil-outline',
                onPress: () => {
                    onEditPost(postId);
                    onClose();
                },
            },
            {
                id: 'moveToTrash',
                label: 'Chuyển vào thùng rác',
                icon: 'trash-outline',
                variant: 'danger',
                onPress: () => {
                    onMoveToTrash(postId);
                    onClose();
                },
            }
        );

        return items;
    }, [postId, onSave, onEditPrivacy, onEditPost, onMoveToTrash, onClose]);

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
                            <Ionicons
                                name={item.icon}
                                size={22}
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
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.normal,
        lineHeight: 24,
    },
    divider: {
        height: 1,
        marginHorizontal: 0,
    },
});
