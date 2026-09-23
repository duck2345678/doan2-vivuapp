/**
 * SettingsSectionCard Component
 * Rounded card container with section header and child rows
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SettingsSectionCardProps {
    title: string;
    children: React.ReactNode;
}

export function SettingsSectionCard({ title, children }: SettingsSectionCardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {title}
            </Text>
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.borderLight,
                    },
                    Shadows.card,
                ]}
            >
                {React.Children.map(children, (child, index) => (
                    <View key={index}>
                        {child}
                        {index < React.Children.count(children) - 1 && (
                            <View
                                style={[
                                    styles.separator,
                                    { backgroundColor: colors.borderLight },
                                ]}
                            />
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    card: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    separator: {
        height: 1,
        marginLeft: 68, // Icon tile width (40) + padding (16) + gap (12)
    },
});
