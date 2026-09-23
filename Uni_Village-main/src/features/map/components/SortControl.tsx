import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors, MapColors, Shadows } from '@/shared/constants/theme';
import { Typography } from '@/shared/constants/typography';
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SortOption = 'distance' | 'rating';

interface SortControlProps {
    sortOption: SortOption;
    onSortChange: (option: SortOption) => void;
    colorScheme?: 'light' | 'dark';
}

export const SortControl = memo(function SortControl({
    sortOption,
    onSortChange,
    colorScheme = 'light',
}: SortControlProps) {
    const colors = Colors[colorScheme];
    const mapColors = MapColors[colorScheme];

    const toggleSort = () => {
        onSortChange(sortOption === 'distance' ? 'rating' : 'distance');
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: mapColors.chipBackground }
            ]}
            onPress={toggleSort}
            activeOpacity={0.7}
        >
            <MaterialIcons
                name="sort"
                size={18}
                color={colors.icon}
                style={styles.icon}
            />
            <Text style={[styles.label, { color: colors.text }]}>
                {sortOption === 'distance' ? 'Khoảng cách' : 'Đánh giá'}
            </Text>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.pill,
        ...Shadows.chip,
        marginLeft: Spacing.sm,
    },
    icon: {
        marginRight: Spacing.xs,
    },
    label: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium as any,
    },
});
