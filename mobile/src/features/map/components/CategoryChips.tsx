import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors, MapColors, Shadows } from '@/shared/constants/theme';
import { Typography } from '@/shared/constants/typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback } from 'react';
import {
    FlatList,
    ListRenderItem,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CATEGORY_CHIPS } from '../constants/mapConstants';
import type { CategoryChip, PlaceCategory } from '../types';

interface CategoryChipsProps {
    activeCategory: PlaceCategory | 'all';
    onCategoryPress: (category: PlaceCategory | 'all') => void;
    colorScheme?: 'light' | 'dark';
}

export const CategoryChips = memo(function CategoryChips({
    activeCategory,
    onCategoryPress,
    colorScheme = 'light',
}: CategoryChipsProps) {
    const colors = Colors[colorScheme];
    const mapColors = MapColors[colorScheme];

    const renderChip: ListRenderItem<CategoryChip> = useCallback(
        ({ item }) => {
            const isActive = item.id === activeCategory;

            return (
                <TouchableOpacity
                    style={[
                        styles.chip,
                        {
                            backgroundColor: isActive
                                ? mapColors.chipActiveBackground
                                : mapColors.chipBackground,
                        },
                    ]}
                    onPress={() => onCategoryPress(item.id)}
                    activeOpacity={0.7}
                >
                    <MaterialIcons
                        name={item.icon as any}
                        size={18}
                        color={isActive ? mapColors.chipActiveText : colors.icon}
                        style={styles.chipIcon}
                    />
                    <Text
                        style={[
                            styles.chipLabel,
                            {
                                color: isActive
                                    ? mapColors.chipActiveText
                                    : mapColors.chipText,
                            },
                        ]}
                    >
                        {item.label}
                    </Text>
                </TouchableOpacity>
            );
        },
        [activeCategory, onCategoryPress, colors, mapColors]
    );

    const keyExtractor = useCallback((item: CategoryChip) => item.id, []);

    return (
        <View style={styles.container}>
            <FlatList
                data={CATEGORY_CHIPS}
                renderItem={renderChip}
                keyExtractor={keyExtractor}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        height: 48,
    },
    listContent: {
        paddingHorizontal: Spacing.screenPadding,
        alignItems: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.pill,
        ...Shadows.chip,
    },
    chipIcon: {
        marginRight: Spacing.xs,
    },
    chipLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium as any,
    },
    separator: {
        width: Spacing.sm,
    },
});
