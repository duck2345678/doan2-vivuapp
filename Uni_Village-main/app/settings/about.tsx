/**
 * About Route
 * Placeholder screen for app information
 */

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutRoute() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={['top']}
        >
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialIcons name="chevron-left" size={28} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    Giới thiệu
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <MaterialIcons name="info-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.appName, { color: colors.textPrimary }]}>
                    UniVillage
                </Text>
                <Text style={[styles.versionText, { color: colors.textSecondary }]}>
                    Phiên bản 1.0.0
                </Text>
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                    Mạng xã hội dành cho sinh viên đại học
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold,
    },
    headerSpacer: {
        width: 44,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    appName: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: Typography.weights.bold,
        marginTop: Spacing.md,
    },
    versionText: {
        fontSize: Typography.sizes.md,
        marginTop: Spacing.xs,
    },
    descriptionText: {
        fontSize: Typography.sizes.base,
        marginTop: Spacing.md,
        textAlign: 'center',
    },
});
