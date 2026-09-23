/**
 * RouteAlternatives Component
 *
 * Displays alternative routes for comparison during route selection
 * Shows distance, duration, and traffic status for each route
 */

import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export interface RouteOption {
    /** Unique identifier */
    id: string;
    /** Route summary/name */
    summary: string;
    /** Total distance text (e.g., "5.2 km") */
    distance: string;
    /** Total duration text (e.g., "15 min") */
    duration: string;
    /** Duration in traffic (optional) */
    durationInTraffic?: string;
    /** Whether this route has heavy traffic */
    hasTraffic?: boolean;
    /** Whether this is the fastest route */
    isFastest?: boolean;
    /** Whether this is the shortest route */
    isShortest?: boolean;
    /** Encoded polyline for this route */
    polyline?: string;
}

interface RouteAlternativesProps {
    /** Available route options */
    routes: RouteOption[];
    /** Currently selected route ID */
    selectedRouteId: string | null;
    /** Called when a route is selected */
    onRouteSelect: (routeId: string) => void;
    /** Whether routes are loading */
    isLoading?: boolean;
    /** Color scheme */
    colorScheme?: 'light' | 'dark';
}

const RouteCard = memo(function RouteCard({
    route,
    isSelected,
    onPress,
}: {
    route: RouteOption;
    isSelected: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.routeCard, isSelected && styles.routeCardSelected]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Route Icon */}
            <View style={[styles.routeIcon, isSelected && styles.routeIconSelected]}>
                <Ionicons
                    name="navigate"
                    size={20}
                    color={isSelected ? '#FFF' : '#3B82F6'}
                />
            </View>

            {/* Route Info */}
            <View style={styles.routeInfo}>
                <View style={styles.routeHeader}>
                    <Text style={[styles.routeDuration, isSelected && styles.textSelected]}>
                        {route.durationInTraffic || route.duration}
                    </Text>
                    {route.isFastest && (
                        <View style={styles.badge}>
                            <Ionicons name="flash" size={12} color="#22C55E" />
                            <Text style={styles.badgeText}>Nhanh nhất</Text>
                        </View>
                    )}
                    {route.isShortest && !route.isFastest && (
                        <View style={[styles.badge, styles.badgeSecondary]}>
                            <Ionicons name="resize" size={12} color="#3B82F6" />
                            <Text style={[styles.badgeText, styles.badgeTextSecondary]}>
                                Ngắn nhất
                            </Text>
                        </View>
                    )}
                </View>

                <Text style={[styles.routeDistance, isSelected && styles.textSelected]}>
                    {route.distance} • via {route.summary}
                </Text>

                {route.hasTraffic && (
                    <View style={styles.trafficWarning}>
                        <Ionicons name="warning" size={14} color="#F59E0B" />
                        <Text style={styles.trafficText}>Đang có giao thông đông đúc</Text>
                    </View>
                )}
            </View>

            {/* Selection Indicator */}
            <View style={styles.selectionIndicator}>
                <View
                    style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                    ]}
                >
                    {isSelected && <View style={styles.radioInner} />}
                </View>
            </View>
        </TouchableOpacity>
    );
});

const RouteAlternativesComponent: React.FC<RouteAlternativesProps> = ({
    routes,
    selectedRouteId,
    onRouteSelect,
    isLoading = false,
}) => {
    const renderRoute = useCallback(
        ({ item }: { item: RouteOption }) => (
            <RouteCard
                route={item}
                isSelected={item.id === selectedRouteId}
                onPress={() => onRouteSelect(item.id)}
            />
        ),
        [selectedRouteId, onRouteSelect]
    );

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Đang tìm các tuyến đường...</Text>
                </View>
            </View>
        );
    }

    if (routes.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Ionicons name="map-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Không tìm thấy tuyến đường</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Chọn tuyến đường</Text>
            <FlatList
                data={routes}
                renderItem={renderRoute}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        maxHeight: 280,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    routeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        gap: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    routeCardSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
    },
    routeIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    routeIconSelected: {
        backgroundColor: '#3B82F6',
    },
    routeInfo: {
        flex: 1,
        gap: 4,
    },
    routeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    routeDuration: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    routeDistance: {
        fontSize: 14,
        color: '#6B7280',
    },
    textSelected: {
        color: '#1E40AF',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    badgeSecondary: {
        backgroundColor: '#DBEAFE',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#22C55E',
    },
    badgeTextSecondary: {
        color: '#3B82F6',
    },
    trafficWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    trafficText: {
        fontSize: 12,
        color: '#F59E0B',
    },
    selectionIndicator: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: {
        borderColor: '#3B82F6',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3B82F6',
    },
    loadingContainer: {
        padding: 32,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
    },
});

export const RouteAlternatives = memo(RouteAlternativesComponent);
