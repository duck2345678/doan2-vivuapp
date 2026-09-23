import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface InterestChipsProps {
    interests: string[];
    onRemove: (interest: string) => void;
    onAddPress: () => void;
}

export function InterestChips({ interests, onRemove, onAddPress }: InterestChipsProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={styles.container}>
            {interests.map((interest) => (
                <View
                    key={interest}
                    style={[
                        styles.chip,
                        {
                            backgroundColor: colors.chipBackground,
                            borderColor: colors.chipBorder,
                        },
                    ]}
                >
                    <Text style={[styles.chipText, { color: colors.textPrimary }]}>
                        {interest}
                    </Text>
                    <Pressable
                        style={styles.removeButton}
                        onPress={() => onRemove(interest)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialIcons name="close" size={14} color={colors.textSecondary} />
                    </Pressable>
                </View>
            ))}

            <Pressable style={styles.addButton} onPress={onAddPress}>
                <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>
                    + Thêm sở thích
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: Spacing.xs + 2,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        gap: Spacing.xs,
        ...Shadows.chip,
    },
    chipText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.normal,
    },
    removeButton: {
        marginLeft: 2,
    },
    addButton: {
        paddingVertical: Spacing.xs + 2,
    },
    addButtonText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.normal,
    },
});
