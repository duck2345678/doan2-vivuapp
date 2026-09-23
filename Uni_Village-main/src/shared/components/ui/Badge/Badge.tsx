/**
 * Badge Component
 * Status and count badges
 */

import { StyleSheet, Text, View, ViewStyle } from 'react-native';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
    label?: string;
    count?: number;
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
    style?: ViewStyle;
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
    default: { bg: '#e2e8f0', text: '#475569' },
    success: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    error: { bg: '#fee2e2', text: '#991b1b' },
    info: { bg: '#dbeafe', text: '#1e40af' },
};

export function Badge({
    label,
    count,
    variant = 'default',
    size = 'md',
    dot = false,
    style,
}: BadgeProps) {
    const colors = VARIANT_COLORS[variant];
    const displayValue = count !== undefined ? (count > 99 ? '99+' : String(count)) : label;

    if (dot) {
        return (
            <View
                style={[
                    styles.dot,
                    { backgroundColor: colors.bg },
                    size === 'sm' ? styles.dotSm : styles.dotMd,
                    style,
                ]}
            />
        );
    }

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: colors.bg },
                size === 'sm' ? styles.badgeSm : styles.badgeMd,
                style,
            ]}
        >
            <Text
                style={[
                    styles.text,
                    { color: colors.text },
                    size === 'sm' ? styles.textSm : styles.textMd,
                ]}
            >
                {displayValue}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeSm: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 18,
    },
    badgeMd: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 24,
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
    textSm: {
        fontSize: 10,
    },
    textMd: {
        fontSize: 12,
    },
    dot: {
        borderRadius: 100,
    },
    dotSm: {
        width: 6,
        height: 6,
    },
    dotMd: {
        width: 10,
        height: 10,
    },
});
