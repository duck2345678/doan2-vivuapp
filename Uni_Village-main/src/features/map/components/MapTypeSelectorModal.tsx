/**
 * MapTypeSelectorModal - Modal for selecting map display type
 *
 * Replaces Alert.alert with a proper modal UI component.
 * Options: Standard, Satellite, Hybrid
 */

import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors, Shadows } from '@/shared/constants/theme';
import { Typography } from '@/shared/constants/typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { MAP_TYPE_OPTIONS, type MapTypeOption } from '../constants/mapConstants';

interface MapTypeSelectorModalProps {
    /** Whether modal is visible */
    visible: boolean;
    /** Currently selected map type */
    selectedType: MapTypeOption;
    /** Callback when a type is selected */
    onSelect: (type: MapTypeOption) => void;
    /** Callback when modal is dismissed */
    onClose: () => void;
    /** Color scheme */
    colorScheme?: 'light' | 'dark';
}

export const MapTypeSelectorModal = memo(function MapTypeSelectorModal({
    visible,
    selectedType,
    onSelect,
    onClose,
    colorScheme = 'light',
}: MapTypeSelectorModalProps) {
    const colors = Colors[colorScheme];

    const handleSelect = useCallback(
        (type: MapTypeOption) => {
            onSelect(type);
            onClose();
        },
        [onSelect, onClose]
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {/* Backdrop */}
            <Pressable style={styles.backdrop} onPress={onClose}>
                <View />
            </Pressable>

            {/* Content */}
            <View style={styles.contentWrapper}>
                <View
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.card,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Kiểu bản đồ
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="close" size={24} color={colors.icon} />
                        </TouchableOpacity>
                    </View>

                    {/* Options */}
                    <View style={styles.optionsContainer}>
                        {MAP_TYPE_OPTIONS.map((option) => {
                            const isSelected = option.id === selectedType;
                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.optionItem,
                                        {
                                            backgroundColor: isSelected
                                                ? colors.tint + '15'
                                                : colors.muted,
                                            borderColor: isSelected
                                                ? colors.tint
                                                : 'transparent',
                                        },
                                    ]}
                                    onPress={() => handleSelect(option.id)}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.optionIcon,
                                            {
                                                backgroundColor: isSelected
                                                    ? colors.tint
                                                    : colors.icon + '30',
                                            },
                                        ]}
                                    >
                                        <MaterialIcons
                                            name={option.icon as any}
                                            size={24}
                                            color={isSelected ? '#fff' : colors.icon}
                                        />
                                    </View>
                                    <Text
                                        style={[
                                            styles.optionLabel,
                                            {
                                                color: isSelected ? colors.tint : colors.text,
                                                fontWeight: isSelected ? '600' : '400',
                                            },
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                    {isSelected && (
                                        <MaterialIcons
                                            name="check-circle"
                                            size={20}
                                            color={colors.tint}
                                            style={styles.checkIcon}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.screenPadding,
        ...Shadows.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold as any,
    },
    optionsContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    optionItem: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        gap: Spacing.sm,
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionLabel: {
        fontSize: Typography.sizes.sm,
    },
    checkIcon: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
    },
});
