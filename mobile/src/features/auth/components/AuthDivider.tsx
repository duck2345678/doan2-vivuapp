/**
 * AuthDivider Component
 * Horizontal lines with centered text
 */

import { Colors } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AuthDividerProps {
    label: string;
}

export function AuthDivider({ label }: AuthDividerProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={styles.container}>
            <View style={[styles.line, { backgroundColor: colors.authDividerLine }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
                {label}
            </Text>
            <View style={[styles.line, { backgroundColor: colors.authDividerLine }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
    },
    label: {
        marginHorizontal: 16,
        fontSize: 14,
    },
});
