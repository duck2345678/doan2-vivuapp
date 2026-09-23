import type { MapMarker, MapRegion } from "@/features/map/types";
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

export interface DestinationMapProps {
  markers: MapMarker[];
  selectedMarkersWithOrder: Map<string, number>; // markerId -> order number
  initialRegion: MapRegion;
  onMarkerPress?: (markerId: string) => void;
  onRegionChange?: (region: MapRegion) => void;
  colorScheme?: "light" | "dark";
}

export interface DestinationMapRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  animateToCoordinate: (coordinate: { latitude: number; longitude: number }) => void;
}

export const DestinationMap = forwardRef<DestinationMapRef, DestinationMapProps>(
  function DestinationMap(
    {
      markers,
      selectedMarkersWithOrder,
      initialRegion,
      onMarkerPress,
      onRegionChange,
      colorScheme = "light",
    },
    ref
  ) {
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region: MapRegion, duration = 500) => {
        mapRef.current?.animateToRegion(region, duration);
      },
      animateToCoordinate: (coordinate) => {
        mapRef.current?.animateToRegion(
          {
            ...coordinate,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500
        );
      },
    }));

    const handleRegionChangeComplete = useCallback(
      (region: Region) => {
        onRegionChange?.({
          latitude: region.latitude,
          longitude: region.longitude,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        });
      },
      [onRegionChange]
    );

    const mapStyle = useMemo(() => {
      if (colorScheme === "dark") {
        return [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        ];
      }
      return [];
    }, [colorScheme]);

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        customMapStyle={mapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {markers.map((marker) => {
          const order = selectedMarkersWithOrder.get(marker.id);
          const isSelected = order !== undefined;

          return (
            <Marker
              key={marker.id}
              coordinate={marker.coordinate}
              onPress={() => onMarkerPress?.(marker.id)}
              tracksViewChanges={false}
            >
              <View style={styles.markerContainer}>
                {isSelected ? (
                  <View style={[styles.selectedMarker]}>
                    <Text style={styles.markerNumber}>{order}</Text>
                  </View>
                ) : (
                  <View style={[styles.defaultMarker]} />
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>
    );
  }
);

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: "100%",
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectedMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerNumber: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  defaultMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
