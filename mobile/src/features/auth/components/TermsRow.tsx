/**
 * TermsRow Component
 * Checkbox with terms and privacy policy links (Register screen)
 */

import { Colors } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface TermsRowProps {
    checked: boolean;
    onToggle: () => void;
    onTermsPress: () => void;
    onPrivacyPress: () => void;
    error?: string;
}

export function TermsRow({
    checked,
    onToggle,
    onTermsPress,
    onPrivacyPress,
    error,
}: TermsRowProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <Pressable
                    onPress={onToggle}
                    style={[
                        styles.checkbox,
                        {
                            borderColor: error ? Colors.light.error : colors.checkboxBorder,
                            backgroundColor: checked ? colors.authPrimaryButton : 'transparent',
                        },
                    ]}
                    hitSlop={8}
                >
                    {checked && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                </Pressable>
                <Text style={[styles.text, { color: colors.textSecondary }]}>
                    Tôi đồng ý với{' '}
                    <Text
                        style={[styles.link, { color: colors.authLinkText }]}
                        onPress={onTermsPress}
                    >
                        Điều khoản sử dụng
                    </Text>
                    {' '}và{' '}
                    <Text
                        style={[styles.link, { color: colors.authLinkText }]}
                        onPress={onPrivacyPress}
                    >
                        Chính sách bảo mật
                    </Text>
                </Text>
            </View>
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
        marginVertical: 8,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    text: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    link: {
        textDecorationLine: 'underline',
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
        marginLeft: 32,
    },
});
