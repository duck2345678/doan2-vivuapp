import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

export interface EditProfileFormSectionProps {
    label: string;
    children: React.ReactNode;
    showBorder?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
}

export function EditProfileFormSection({
    label,
    children,
    showBorder = true,
    containerStyle,
}: EditProfileFormSectionProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View
            style={[
                styles.container,
                showBorder && { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
                containerStyle,
            ]}
        >
            <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md - 2,
    },
    label: {
        fontSize: Typography.sizes['15'],
        fontWeight: Typography.weights.normal,
        marginBottom: Spacing.xs,
    },
    content: {
        // Content container
    },
});
