/**
 * Route Overlay Component
 * 
 * Displays a route on the map with polyline and info panel.
 * Shows distance, duration, and turn-by-turn instructions preview.
 */

import type { NavigationRoute, RouteStep } from '@/lib/maps/googleMapsService';
import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors, Shadows } from '@/shared/constants/theme';
import { Typography } from '@/shared/constants/typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteAlternatives, type RouteOption } from './RouteAlternatives';

interface RouteOverlayProps {
    /** Route data from Directions API */
    route: NavigationRoute | null;
    /** Alternative routes for comparison */
    alternativeRoutes?: RouteOption[];
    /** Selected route ID when using alternatives */
    selectedRouteId?: string;
    /** Callback when selecting alternative route */
    onRouteSelect?: (routeId: string) => void;
    /** Whether the route is loading */
    isLoading?: boolean;
    /** Callback to start navigation */
    onStartNavigation?: () => void;
    /** Callback to close the route panel */
    onClose?: () => void;
    /** Color scheme */
    colorScheme?: 'light' | 'dark';
}

export const RouteOverlay = memo(function RouteOverlay({
    route,
    alternativeRoutes,
    selectedRouteId,
    onRouteSelect,
    isLoading = false,
    onStartNavigation,
    onClose,
    colorScheme = 'light',
}: RouteOverlayProps) {
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();

    const getManeuverIcon = useCallback((maneuver?: RouteStep['maneuver']): string => {
        switch (maneuver) {
            case 'turn-left':
                return 'turn-left';
            case 'turn-right':
                return 'turn-right';
            case 'u-turn':
                return 'u-turn-left';
            case 'roundabout-left':
            case 'roundabout-right':
                return 'roundabout-left';
            case 'merge':
                return 'merge';
            case 'straight':
            default:
                return 'arrow-upward';
        }
    }, []);

    if (!route && !isLoading) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>
            {/* Header */}
            <View style={styles.header}>
                {onClose && (
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialIcons name="close" size={24} color={colors.icon} />
                    </TouchableOpacity>
                )}

                <View style={styles.headerContent}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        Chỉ đường
                    </Text>
                </View>
            </View>

            {/* Route summary */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.icon }]}>
                        Đang tính toán đường đi...
                    </Text>
                </View>
            ) : route ? (
                <>
                    {/* Distance and Duration */}
                    <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.summaryItem}>
                            <MaterialIcons name="straighten" size={20} color={colors.tint} />
                            <Text style={[styles.summaryValue, { color: colors.text }]}>
                                {route.distance}
                            </Text>
                            <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                Khoảng cách
                            </Text>
                        </View>

                        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

                        <View style={styles.summaryItem}>
                            <MaterialIcons name="schedule" size={20} color={colors.tint} />
                            <Text style={[styles.summaryValue, { color: colors.text }]}>
                                {route.duration}
                            </Text>
                            <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                Thời gian
                            </Text>
                        </View>
                    </View>

                    {/* Route Alternatives (when available) */}
                    {alternativeRoutes && alternativeRoutes.length > 0 && onRouteSelect && (
                        <View style={styles.alternativesSection}>
                            <RouteAlternatives
                                routes={alternativeRoutes}
                                selectedRouteId={selectedRouteId || alternativeRoutes[0].id}
                                onRouteSelect={onRouteSelect}
                            />
                        </View>
                    )}

                    {/* Turn-by-turn instructions */}
                    <View style={styles.stepsSection}>
                        <Text style={[styles.stepsTitle, { color: colors.text }]}>
                            Hướng dẫn chi tiết
                        </Text>

                        <ScrollView
                            style={styles.stepsList}
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={styles.stepsContent}
                            nestedScrollEnabled={true}
                        >
                            {route.steps.map((step, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.stepItem,
                                        { borderBottomColor: colors.border },
                                        index === route.steps.length - 1 && styles.lastStepItem,
                                    ]}
                                >
                                    <View style={[styles.stepIcon, { backgroundColor: colors.muted }]}>
                                        <MaterialIcons
                                            name={getManeuverIcon(step.maneuver) as any}
                                            size={16}
                                            color={colors.tint}
                                        />
                                    </View>

                                    <View style={styles.stepContent}>
                                        <Text
                                            style={[styles.stepInstruction, { color: colors.text }]}
                                        >
                                            {step.instruction}
                                        </Text>
                                        <Text style={[styles.stepMeta, { color: colors.icon }]}>
                                            {step.distance} • {step.duration}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Start navigation button */}
                    {onStartNavigation && (
                        <TouchableOpacity
                            style={[styles.startButton, { backgroundColor: colors.tint }]}
                            onPress={onStartNavigation}
                            activeOpacity={0.8}
                        >
                            <MaterialIcons name="navigation" size={20} color="#fff" />
                            <Text style={styles.startButtonText}>Bắt đầu</Text>
                        </TouchableOpacity>
                    )}
                </>
            ) : null}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.screenPadding,
        maxHeight: '70%',
        ...Shadows.card,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold as any,
    },
    loadingContainer: {
        padding: Spacing.lg,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: Typography.sizes.sm,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: Spacing.md,
        marginBottom: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: Spacing.xs,
    },
    summaryValue: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold as any,
    },
    summaryLabel: {
        fontSize: Typography.sizes.xs,
    },
    summaryDivider: {
        width: 1,
        height: 40,
        marginHorizontal: Spacing.md,
    },
    stepsSection: {
        flex: 1,
        minHeight: 120,
        maxHeight: 280,
    },
    stepsTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold as any,
        marginBottom: Spacing.sm,
    },
    stepsList: {
        flex: 1,
    },
    stepsContent: {
        paddingBottom: Spacing.lg,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    lastStepItem: {
        borderBottomWidth: 0,
    },
    stepIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    stepContent: {
        flex: 1,
    },
    stepInstruction: {
        fontSize: Typography.sizes.sm,
        lineHeight: Typography.sizes.sm * 1.4,
        marginBottom: 2,
    },
    stepMeta: {
        fontSize: Typography.sizes.xs,
    },
    alternativesSection: {
        marginBottom: Spacing.md,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.md,
        gap: Spacing.sm,
    },
    startButtonText: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold as any,
        color: '#fff',
    },
});
