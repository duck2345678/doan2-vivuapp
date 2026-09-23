import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { ChannelVisibility } from '../types/createPost.types';

// Màu chủ đạo cho toolbar
const TOOLBAR_COLOR = '#6A7282';

interface PostVisibilityDropdownProps {
    visibility: ChannelVisibility;
    onVisibilityChange: (visibility: ChannelVisibility) => void;
}

const VISIBILITY_OPTIONS: {
    key: ChannelVisibility;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    description: string;
}[] = [
        {
            key: 'public',
            label: 'Công khai',
            icon: 'public',
            description: 'Mọi người đều có thể xem',
        },
        {
            key: 'private',
            label: 'Riêng tư',
            icon: 'lock',
            description: 'Chỉ bạn bè có thể xem',
        },
    ];

// Chiều cao ước tính của dropdown menu
const DROPDOWN_HEIGHT = 140;

export function PostVisibilityDropdown({
    visibility,
    onVisibilityChange,
}: PostVisibilityDropdownProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 });
    const triggerRef = useRef<View>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const currentOption = VISIBILITY_OPTIONS.find(opt => opt.key === visibility) || VISIBILITY_OPTIONS[0];

    const openDropdown = useCallback(() => {
        const screenWidth = Dimensions.get('window').width;

        triggerRef.current?.measureInWindow((x, y, width, height) => {
            // Dropdown hiện lên phía trên trigger button
            const dropdownTop = y - DROPDOWN_HEIGHT - 8;

            // Căn dropdown sang phải, cách mép phải màn hình 16px
            const dropdownRight = screenWidth - x - width;

            setDropdownPosition({
                top: dropdownTop > 0 ? dropdownTop : y + height + 8, // Fallback xuống dưới nếu không đủ chỗ
                left: Math.max(16, x - 100), // Đảm bảo không vượt quá mép trái
                right: Math.max(16, dropdownRight),
            });
            setIsOpen(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start();
        });
    }, [fadeAnim]);

    const closeDropdown = useCallback(() => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start(() => {
            setIsOpen(false);
        });
    }, [fadeAnim]);

    const handleSelect = useCallback((selectedVisibility: ChannelVisibility) => {
        onVisibilityChange(selectedVisibility);
        closeDropdown();
    }, [onVisibilityChange, closeDropdown]);

    return (
        <View style={styles.container}>
            {/* Trigger Button */}
            <TouchableOpacity
                ref={triggerRef}
                style={styles.trigger}
                onPress={openDropdown}
                activeOpacity={0.7}
                testID="visibility-dropdown-trigger"
            >
                <MaterialIcons name={currentOption.icon} size={24} color={TOOLBAR_COLOR} />
                <Text style={styles.triggerLabel}>
                    {currentOption.label}
                </Text>
                <MaterialIcons
                    name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={18}
                    color={TOOLBAR_COLOR}
                />
            </TouchableOpacity>

            {/* Dropdown Menu */}
            <Modal
                visible={isOpen}
                transparent
                animationType="none"
                onRequestClose={closeDropdown}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={closeDropdown}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <Animated.View
                                style={[
                                    styles.dropdown,
                                    {
                                        backgroundColor: colorScheme === 'dark' ? colors.card : '#FFFFFF',
                                        top: dropdownPosition.top,
                                        right: dropdownPosition.right,
                                        opacity: fadeAnim,
                                        transform: [{
                                            translateY: fadeAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [8, 0],
                                            }),
                                        }],
                                    },
                                ]}
                            >
                                {VISIBILITY_OPTIONS.map((option, index) => {
                                    const isSelected = visibility === option.key;
                                    const isLastItem = index === VISIBILITY_OPTIONS.length - 1;

                                    return (
                                        <TouchableOpacity
                                            key={option.key}
                                            style={[
                                                styles.option,
                                                isSelected && styles.optionSelected,
                                                !isLastItem && styles.optionBorder,
                                            ]}
                                            onPress={() => handleSelect(option.key)}
                                            activeOpacity={0.7}
                                            testID={`visibility-option-${option.key}`}
                                        >
                                            <View
                                                style={[
                                                    styles.optionIcon,
                                                    { backgroundColor: isSelected ? '#E8F4FD' : colors.chipBackground },
                                                ]}
                                            >
                                                <MaterialIcons
                                                    name={option.icon}
                                                    size={18}
                                                    color={isSelected ? '#2196F3' : TOOLBAR_COLOR}
                                                />
                                            </View>
                                            <View style={styles.optionContent}>
                                                <Text style={[
                                                    styles.optionLabel,
                                                    { color: isSelected ? '#2196F3' : colors.text }
                                                ]}>
                                                    {option.label}
                                                </Text>
                                                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                                                    {option.description}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <MaterialIcons
                                                    name="check-circle"
                                                    size={20}
                                                    color="#2196F3"
                                                />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    triggerLabel: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
        color: TOOLBAR_COLOR,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    dropdown: {
        position: 'absolute',
        width: 260,
        borderRadius: BorderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        overflow: 'hidden',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    optionSelected: {
        backgroundColor: 'rgba(33, 150, 243, 0.05)',
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    optionIcon: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionContent: {
        flex: 1,
    },
    optionLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
    },
    optionDescription: {
        fontSize: Typography.sizes.xs,
        marginTop: 2,
    },
});
