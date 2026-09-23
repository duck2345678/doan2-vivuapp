/**
 * SettingsRow Component
 * Row with icon tile, title, subtitle, and trailing control (chevron or switch)
 */

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

interface BaseRowProps {
    icon: React.ReactNode;
    iconBackgroundColor: string;
    title: string;
    subtitle: string;
}

interface NavigationRowProps extends BaseRowProps {
    type: 'navigation';
    onPress: () => void;
}

interface ToggleRowProps extends BaseRowProps {
    type: 'toggle';
    value: boolean;
    onValueChange: (value: boolean) => void;
}

type SettingsRowProps = NavigationRowProps | ToggleRowProps;

export function SettingsRow(props: SettingsRowProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const handlePress = () => {
        if (props.type === 'navigation') {
            props.onPress();
        } else {
            props.onValueChange(!props.value);
        }
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                pressed && { opacity: 0.7 },
            ]}
            onPress={handlePress}
        >
            {/* Icon Tile */}
            <View
                style={[
                    styles.iconTile,
                    { backgroundColor: props.iconBackgroundColor },
                ]}
            >
                {props.icon}
            </View>

            {/* Text Content */}
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {props.title}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {props.subtitle}
                </Text>
            </View>

            {/* Trailing Control */}
            {props.type === 'navigation' ? (
                <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={colors.textSecondary}
                />
            ) : (
                <Switch
                    value={props.value}
                    onValueChange={props.onValueChange}
                    trackColor={{
                        false: colors.checkboxBorder,
                        true: colors.actionBlue,
                    }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={colors.checkboxBorder}
                />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    iconTile: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm + 4, // 12px gap
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: Typography.sizes.sm,
    },
});
