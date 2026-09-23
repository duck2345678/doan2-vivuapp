/**
 * EditPrivacySheet Component
 * Bottom sheet for editing post privacy/visibility
 * Cho phép chọn: Công khai hoặc Chỉ mình tôi
 */

import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { PostVisibility } from '../types';

interface EditPrivacySheetProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    currentVisibility: PostVisibility;
    onSave: (postId: string, visibility: PostVisibility) => void;
}

interface PrivacyOption {
    id: PostVisibility;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
    {
        id: 'public',
        label: 'Công khai',
        description: 'Mọi người đều có thể xem bài viết này',
        icon: 'globe-outline',
    },
    {
        id: 'private',
        label: 'Chỉ mình tôi',
        description: 'Chỉ bạn có thể xem bài viết này',
        icon: 'lock-closed-outline',
    },
];

/**
 * Bottom sheet for editing post privacy
 * Chỉnh sửa quyền riêng tư bài viết
 */
export function EditPrivacySheet({
    isOpen,
    onClose,
    postId,
    currentVisibility,
    onSave,
}: EditPrivacySheetProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [selectedVisibility, setSelectedVisibility] = useState<PostVisibility>(currentVisibility);

    const snapPoints = useMemo(() => [340], []);

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

    const handleSave = useCallback(() => {
        onSave(postId, selectedVisibility);
        onClose();
    }, [postId, selectedVisibility, onSave, onClose]);

    React.useEffect(() => {
        if (isOpen) {
            bottomSheetRef.current?.expand();
            setSelectedVisibility(currentVisibility);
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isOpen, currentVisibility]);

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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        Ai có thể xem bài viết của bạn?
                    </Text>
                    <View style={styles.closeButton} />
                </View>

                {/* Description */}
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Bài viết có thể hiển thị trên bảng tin, trong hồ sơ cá nhân và kết quả tìm kiếm.
                </Text>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    {PRIVACY_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.optionItem}
                            onPress={() => setSelectedVisibility(option.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: colors.chipBackground }]}>
                                <Ionicons
                                    name={option.icon}
                                    size={22}
                                    color={colors.textPrimary}
                                />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                                    {option.label}
                                </Text>
                                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                                    {option.description}
                                </Text>
                            </View>
                            <View style={styles.radioContainer}>
                                <View
                                    style={[
                                        styles.radioOuter,
                                        {
                                            borderColor:
                                                selectedVisibility === option.id
                                                    ? colors.actionBlue
                                                    : colors.border,
                                        },
                                    ]}
                                >
                                    {selectedVisibility === option.id && (
                                        <View
                                            style={[styles.radioInner, { backgroundColor: colors.actionBlue }]}
                                        />
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.actionBlue }]}
                    onPress={handleSave}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveButtonText}>Lưu</Text>
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
        paddingHorizontal: Spacing.screenPadding,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        textAlign: 'center',
        flex: 1,
    },
    description: {
        fontSize: Typography.sizes.sm,
        lineHeight: 20,
        marginBottom: Spacing.md,
    },
    optionsContainer: {
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionContent: {
        flex: 1,
    },
    optionLabel: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.medium,
    },
    optionDescription: {
        fontSize: Typography.sizes.sm,
        marginTop: 2,
    },
    radioContainer: {
        padding: 4,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    saveButton: {
        paddingVertical: 14,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
    },
});
