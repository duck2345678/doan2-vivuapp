/**
 * Button Component
 * Base button with multiple variants
 */

import { Colors } from '@/shared/constants/theme';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    Pressable,
    PressableProps,
    StyleSheet,
    Text,
    TextStyle,
    ViewStyle,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
    title: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export function Button({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    style,
    textStyle,
    onPress,
    ...pressableProps
}: ButtonProps) {
    const isDisabled = disabled || loading;

    const getPressableStyle = useCallback(
        ({ pressed }: { pressed: boolean }) => [
            styles.base,
            styles[variant],
            styles[`size_${size}`],
            fullWidth && styles.fullWidth,
            pressed && styles.pressed,
            isDisabled && styles.disabled,
            style,
        ],
        [variant, size, fullWidth, isDisabled, style]
    );

    return (
        <Pressable
            style={getPressableStyle}
            disabled={isDisabled}
            onPress={onPress}
            {...pressableProps}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'outline' || variant === 'ghost' ? Colors.light.tint : '#fff'}
                />
            ) : (
                <>
                    {leftIcon}
                    <Text
                        style={[
                            styles.text,
                            styles[`text_${variant}`],
                            styles[`text_${size}`],
                            isDisabled && styles.textDisabled,
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                    {rightIcon}
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        gap: 8,
    },
    // Variants
    primary: {
        backgroundColor: Colors.light.tint,
    },
    secondary: {
        backgroundColor: Colors.light.icon,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.light.tint,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: '#dc2626',
    },
    // Sizes
    size_sm: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    size_md: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    size_lg: {
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    // States
    pressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    disabled: {
        opacity: 0.5,
    },
    fullWidth: {
        width: '100%',
    },
    // Text styles
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
    text_primary: {
        color: '#fff',
    },
    text_secondary: {
        color: '#fff',
    },
    text_outline: {
        color: Colors.light.tint,
    },
    text_ghost: {
        color: Colors.light.tint,
    },
    text_danger: {
        color: '#fff',
    },
    text_sm: {
        fontSize: 14,
    },
    text_md: {
        fontSize: 16,
    },
    text_lg: {
        fontSize: 18,
    },
    textDisabled: {
        opacity: 0.7,
    },
});
