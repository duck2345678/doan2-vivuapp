/**
 * MarkerCluster Component
 *
 * Implements marker clustering for performance optimization
 * Groups nearby markers when zoomed out
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { MapMarker, MapRegion } from '../types';

interface MarkerClusterProps {
    /** All markers to cluster */
    markers: MapMarker[];
    /** Current map region */
    region: MapRegion;
    /** Minimum zoom level to start clustering */
    clusterThreshold?: number;
    /** Selected marker ID (won't be clustered) */
    selectedMarkerId?: string | null;
    /** Called when a marker or cluster is pressed */
    onMarkerPress: (markerId: string) => void;
    /** Called when a cluster is pressed */
    onClusterPress?: (clusterCenter: { latitude: number; longitude: number }) => void;
    colorScheme?: 'light' | 'dark';
}

interface Cluster {
    id: string;
    markers: MapMarker[];
    center: { latitude: number; longitude: number };
}

/**
 * Simple clustering algorithm based on grid
 */
function clusterMarkers(
    markers: MapMarker[],
    region: MapRegion,
    gridSize: number
): Cluster[] {
    const clusters: Map<string, MapMarker[]> = new Map();

    markers.forEach((marker) => {
        const gridX = Math.floor(
            (marker.coordinate.longitude - region.longitude) / (region.longitudeDelta / gridSize)
        );
        const gridY = Math.floor(
            (marker.coordinate.latitude - region.latitude) / (region.latitudeDelta / gridSize)
        );
        const key = `${gridX}_${gridY}`;

        if (!clusters.has(key)) {
            clusters.set(key, []);
        }
        clusters.get(key)!.push(marker);
    });

    return Array.from(clusters.entries()).map(([key, clusterMarkers]) => {
        const avgLat =
            clusterMarkers.reduce((sum, m) => sum + m.coordinate.latitude, 0) /
            clusterMarkers.length;
        const avgLng =
            clusterMarkers.reduce((sum, m) => sum + m.coordinate.longitude, 0) /
            clusterMarkers.length;

        return {
            id: key,
            markers: clusterMarkers,
            center: { latitude: avgLat, longitude: avgLng },
        };
    });
}

const ClusterMarker = memo(function ClusterMarker({
    cluster,
    onPress,
}: {
    cluster: Cluster;
    onPress: () => void;
}) {
    const count = cluster.markers.length;
    const size = Math.min(60, 32 + count * 2);

    return (
        <Marker
            coordinate={cluster.center}
            onPress={onPress}
            tracksViewChanges={Platform.OS === 'ios'}
        >
            <View
                style={[
                    styles.clusterContainer,
                    { width: size, height: size, borderRadius: size / 2 },
                ]}
            >
                <Text style={styles.clusterText}>{count}</Text>
            </View>
        </Marker>
    );
});

const SingleMarker = memo(function SingleMarker({
    marker,
    isSelected,
    onPress,
}: {
    marker: MapMarker;
    isSelected: boolean;
    onPress: () => void;
}) {
    return (
        <Marker
            identifier={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            onPress={onPress}
            tracksViewChanges={Platform.OS === 'ios'}
        >
            <View
                style={[
                    styles.markerContainer,
                    isSelected && styles.markerContainerSelected,
                ]}
            >
                <MaterialIcons
                    name="place"
                    size={isSelected ? 24 : 20}
                    color="#FFF"
                />
            </View>
        </Marker>
    );
});

const MarkerClusterComponent: React.FC<MarkerClusterProps> = ({
    markers,
    region,
    clusterThreshold = 0.02,
    selectedMarkerId,
    onMarkerPress,
    onClusterPress,
}) => {
    // Determine if we should cluster based on zoom level
    const shouldCluster = region.latitudeDelta > clusterThreshold;
    const gridSize = 4; // 4x4 grid for clustering

    // Separate selected marker to always show it individually
    const { selectedMarker, otherMarkers } = useMemo(() => {
        const selected = markers.find((m) => m.id === selectedMarkerId);
        const others = markers.filter((m) => m.id !== selectedMarkerId);
        return { selectedMarker: selected, otherMarkers: others };
    }, [markers, selectedMarkerId]);

    // Cluster other markers
    const clusters = useMemo(() => {
        if (!shouldCluster) return [];
        return clusterMarkers(otherMarkers, region, gridSize);
    }, [shouldCluster, otherMarkers, region]);

    // If not clustering, just render all markers
    if (!shouldCluster) {
        return (
            <>
                {markers.map((marker) => (
                    <SingleMarker
                        key={marker.id}
                        marker={marker}
                        isSelected={marker.id === selectedMarkerId}
                        onPress={() => onMarkerPress(marker.id)}
                    />
                ))}
            </>
        );
    }

    return (
        <>
            {/* Render clusters */}
            {clusters.map((cluster) =>
                cluster.markers.length === 1 ? (
                    <SingleMarker
                        key={cluster.markers[0].id}
                        marker={cluster.markers[0]}
                        isSelected={cluster.markers[0].id === selectedMarkerId}
                        onPress={() => onMarkerPress(cluster.markers[0].id)}
                    />
                ) : (
                    <ClusterMarker
                        key={cluster.id}
                        cluster={cluster}
                        onPress={() => onClusterPress?.(cluster.center)}
                    />
                )
            )}

            {/* Always render selected marker individually */}
            {selectedMarker && (
                <SingleMarker
                    marker={selectedMarker}
                    isSelected={true}
                    onPress={() => onMarkerPress(selectedMarker.id)}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    clusterContainer: {
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    clusterText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    markerContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    markerContainerSelected: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#22C55E',
        borderWidth: 3,
    },
});

export const MarkerCluster = memo(MarkerClusterComponent);
