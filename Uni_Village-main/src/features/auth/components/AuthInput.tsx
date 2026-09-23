/**
 * AuthInput Component
 * Pill-shaped input with left icon and optional eye toggle for password
 */

import { Colors, Shadows } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    KeyboardTypeOptions,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface AuthInputProps {
    placeholder: string;
    leftIconName: keyof typeof Ionicons.glyphMap;
    isPassword?: boolean;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    error?: string;
}

export function AuthInput({
    placeholder,
    leftIconName,
    isPassword = false,
    value,
    onChangeText,
    onBlur,
    keyboardType = 'default',
    autoCapitalize = 'none',
    error,
}: AuthInputProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => {
        setIsFocused(false);
        onBlur?.();
    };

    // Focus input khi tap vào container
    const handleContainerPress = () => {
        inputRef.current?.focus();
    };

    return (
        <View style={styles.wrapper}>
            <Pressable
                onPress={handleContainerPress}
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.authInputBackground,
                        borderColor: error ? Colors.light.error : colors.authInputBorder,
                    },
                    isFocused && styles.containerFocused,
                ]}
            >
                <Ionicons
                    name={leftIconName}
                    size={20}
                    color={colors.authInputPlaceholder}
                    style={styles.leftIcon}
                />
                <TextInput
                    ref={inputRef}
                    style={[
                        styles.input,
                        { color: colors.textPrimary },
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.authInputPlaceholder}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    secureTextEntry={isPassword && !showPassword}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    editable={true}
                />
                {isPassword && (
                    <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                        hitSlop={8}
                    >
                        <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={22}
                            color={colors.authInputPlaceholder}
                        />
                    </Pressable>
                )}
            </Pressable>
            {error && (
                <Text style={[styles.errorText, { color: Colors.light.error }]}>
                    {error}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        marginBottom: 12,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderWidth: 1.63,
        borderRadius: 999,
        paddingHorizontal: 24,
    },
    containerFocused: {
        ...Shadows.sm,
    },
    leftIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
    },
    eyeButton: {
        marginLeft: 8,
        padding: 4,
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
        marginLeft: 24,
    },
});
