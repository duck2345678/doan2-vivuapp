/**
 * Input Component
 * Base text input with validation states
 */

import { Colors } from '@/shared/constants/theme';
import React, { forwardRef, useState } from 'react';
import {
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TextStyle,
    View,
    ViewStyle
} from 'react-native';

export interface InputProps extends Omit<TextInputProps, 'style'> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
    disabled?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
    (
        {
            label,
            error,
            hint,
            leftIcon,
            rightIcon,
            containerStyle,
            inputStyle,
            disabled = false,
            onFocus,
            onBlur,
            ...textInputProps
        },
        ref
    ) => {
        const [isFocused, setIsFocused] = useState(false);

        const handleFocus = (e: any) => {
            setIsFocused(true);
            onFocus?.(e);
        };

        const handleBlur = (e: any) => {
            setIsFocused(false);
            onBlur?.(e);
        };

        return (
            <View style={[styles.container, containerStyle]}>
                {label && <Text style={styles.label}>{label}</Text>}
                <View
                    style={[
                        styles.inputContainer,
                        isFocused && styles.focused,
                        error && styles.error,
                        disabled && styles.disabled,
                    ]}
                >
                    {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                    <TextInput
                        ref={ref}
                        style={[
                            styles.input,
                            !!leftIcon && styles.inputWithLeftIcon,
                            !!rightIcon && styles.inputWithRightIcon,
                            inputStyle,
                        ]}
                        placeholderTextColor={Colors.light.icon}
                        editable={!disabled}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        {...textInputProps}
                    />
                    {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
                {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
            </View>
        );
    }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.light.text,
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: Colors.light.text,
    },
    inputWithLeftIcon: {
        paddingLeft: 8,
    },
    inputWithRightIcon: {
        paddingRight: 8,
    },
    iconLeft: {
        paddingLeft: 12,
    },
    iconRight: {
        paddingRight: 12,
    },
    focused: {
        borderColor: Colors.light.tint,
    },
    error: {
        borderColor: '#dc2626',
    },
    disabled: {
        backgroundColor: '#f1f5f9',
        opacity: 0.7,
    },
    errorText: {
        fontSize: 12,
        color: '#dc2626',
        marginTop: 4,
    },
    hintText: {
        fontSize: 12,
        color: Colors.light.icon,
        marginTop: 4,
    },
});
