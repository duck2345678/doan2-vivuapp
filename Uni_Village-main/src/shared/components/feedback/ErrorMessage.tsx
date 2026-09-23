import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { Button } from '../ui';

export interface ErrorMessageProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
}

export function ErrorMessage({
    title = 'Có lỗi xảy ra',
    message = 'Vui lòng thử lại sau',
    onRetry,
    retryLabel = 'Thử lại',
}: ErrorMessageProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: colors.errorLight || '#FFEBEE' }]}>
                <MaterialIcons name="error-outline" size={48} color={colors.error || '#F44336'} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

            {onRetry && (
                <Button
                    title={retryLabel}
                    onPress={onRetry}
                    variant="outline"
                    size="md"
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
        padding: Spacing.screenPadding,
        gap: Spacing.md,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.semibold,
        textAlign: 'center',
    },
    message: {
        fontSize: Typography.sizes.base,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
});
