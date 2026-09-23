import type { MapMarker, MapRegion } from "@/features/map/types";
import { Colors } from "@/shared/constants/theme";
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

export interface AIItineraryMapProps {
  destinations: Array<{
    id: string;
    name: string;
    lat?: number;
    lng?: number;
    order: number;
  }>;
  initialRegion?: MapRegion;
  onRegionChange?: (region: MapRegion) => void;
  colorScheme?: "light" | "dark";
  userLocation?: { latitude: number; longitude: number } | null;
}

export interface AIItineraryMapRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  animateToCoordinate: (coordinate: { latitude: number; longitude: number }) => void;
  fitToCoordinates: () => void;
}

export const AIItineraryMap = forwardRef<AIItineraryMapRef, AIItineraryMapProps>(
  function AIItineraryMap(
    {
      destinations,
      initialRegion,
      onRegionChange,
      colorScheme = "light",
      userLocation,
    },
    ref
  ) {
    const mapRef = useRef<MapView>(null);
    const colors = Colors[colorScheme];

    useImperativeHandle(ref, () => ({
      animateToRegion: (region: MapRegion, duration = 500) => {
        mapRef.current?.animateToRegion(region, duration);
      },
      animateToCoordinate: (coordinate) => {
        mapRef.current?.animateToRegion(
          {
            ...coordinate,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      },
      fitToCoordinates: () => {
        const coordinates = destinations
          .filter(d => d.lat && d.lng)
          .map(d => ({ latitude: d.lat!, longitude: d.lng! }));

        if (userLocation) {
          coordinates.push(userLocation);
        }

        if (coordinates.length > 0) {
          mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
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

    // Calculate initial region to show all destinations
    const calculatedRegion = useMemo(() => {
      if (initialRegion) return initialRegion;

      const validDestinations = destinations.filter(d => d.lat && d.lng);
      if (validDestinations.length === 0) {
        return {
          latitude: userLocation?.latitude || 10.7626,
          longitude: userLocation?.longitude || 106.6824,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
      }

      const lats = validDestinations.map(d => d.lat!);
      const lngs = validDestinations.map(d => d.lng!);

      if (userLocation) {
        lats.push(userLocation.latitude);
        lngs.push(userLocation.longitude);
      }

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const latDelta = (maxLat - minLat) * 1.5 || 0.02;
      const lngDelta = (maxLng - minLng) * 1.5 || 0.02;

      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lngDelta, 0.01),
      };
    }, [destinations, initialRegion, userLocation]);

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={calculatedRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        customMapStyle={mapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {destinations
          .filter(dest => dest.lat && dest.lng)
          .map((dest) => (
            <Marker
              key={dest.id}
              coordinate={{ latitude: dest.lat!, longitude: dest.lng! }}
              title={dest.name}
              tracksViewChanges={false}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.selectedMarker, { backgroundColor: colors.error }]}>
                  <Text style={styles.markerNumber}>{dest.order}</Text>
                </View>
              </View>
            </Marker>
          ))}
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
});
