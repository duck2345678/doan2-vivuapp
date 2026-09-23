import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface EditProfileFormRowProps {
    label: string;
    value?: string;
    onPress: () => void;
    showBorder?: boolean;
}

export function EditProfileFormRow({
    label,
    value,
    onPress,
    showBorder = true,
}: EditProfileFormRowProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <Pressable
            style={[
                styles.container,
                showBorder && { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
            ]}
            onPress={onPress}
        >
            <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
            <View style={styles.rightSection}>
                {value && (
                    <Text style={[styles.value, { color: colors.textSecondary }]}>{value}</Text>
                )}
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    label: {
        fontSize: Typography.sizes['15'],
        fontWeight: Typography.weights.normal,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    value: {
        fontSize: Typography.sizes['15'],
        fontWeight: Typography.weights.normal,
    },
});
