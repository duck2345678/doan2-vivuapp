/**
 * BottomSheetModal Component
 * Reusable bottom sheet modal with backdrop and animated sheet
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    icon: React.ReactNode;
    iconBackgroundColor: string;
    children: React.ReactNode;
}

export function BottomSheetModal({
    visible,
    onClose,
    title,
    icon,
    iconBackgroundColor,
    children,
}: BottomSheetModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    // Animation values
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            // Animate in
            Animated.parallel([
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(sheetTranslateY, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Animate out
            Animated.parallel([
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(sheetTranslateY, {
                    toValue: SCREEN_HEIGHT,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, backdropOpacity, sheetTranslateY]);

    const handleBackdropPress = () => {
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {/* Backdrop */}
            <Animated.View
                style={[
                    styles.backdrop,
                    { opacity: backdropOpacity },
                ]}
            >
                <Pressable
                    style={styles.backdropPressable}
                    onPress={handleBackdropPress}
                />
            </Animated.View>

            {/* Sheet */}
            <Animated.View
                style={[
                    styles.sheetContainer,
                    {
                        transform: [{ translateY: sheetTranslateY }],
                    },
                ]}
            >
                <View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.background,
                        },
                        Shadows.xl,
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        {/* Icon + Title */}
                        <View style={styles.headerLeft}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: iconBackgroundColor },
                                ]}
                            >
                                {icon}
                            </View>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                {title}
                            </Text>
                        </View>

                        {/* Close Button */}
                        <Pressable
                            style={styles.closeButton}
                            onPress={onClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons
                                name="close"
                                size={24}
                                color={colors.textSecondary}
                            />
                        </Pressable>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>{children}</View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdropPressable: {
        flex: 1,
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    sheet: {
        borderTopLeftRadius: BorderRadius.pill,
        borderTopRightRadius: BorderRadius.pill,
        paddingBottom: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md + 4, // 20px
        paddingVertical: Spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm + 4, // 12px
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: Spacing.md + 4, // 20px
    },
});
