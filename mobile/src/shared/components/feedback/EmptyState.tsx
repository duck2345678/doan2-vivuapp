/**
 * Empty State Component
 * Display when lists or content are empty
 */

import { Button } from '@/shared/components/ui';
import { Colors } from '@/shared/constants/theme';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

export interface EmptyStateProps {
    icon?: string;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}

export function EmptyState({
    icon = '📭',
    title,
    message,
    actionLabel,
    onAction,
    style,
}: EmptyStateProps) {
    return (
        <View style={[styles.container, style]}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
            {actionLabel && onAction && (
                <Button
                    title={actionLabel}
                    variant="outline"
                    size="sm"
                    onPress={onAction}
                    style={styles.button}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    icon: {
        fontSize: 56,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: Colors.light.icon,
        textAlign: 'center',
        marginBottom: 16,
        maxWidth: 280,
    },
    button: {
        marginTop: 8,
    },
});
