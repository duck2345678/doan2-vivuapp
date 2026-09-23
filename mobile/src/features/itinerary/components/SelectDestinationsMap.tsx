import type { MapMarker, MapRegion } from "@/features/map/types";
import { Colors, MapColors } from "@/shared/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

export interface SelectDestinationsMapProps {
  markers: MapMarker[];
  selectedDestinations: { place: { id: string }; order: number }[];
  initialRegion: MapRegion;
  onMarkerPress?: (markerId: string) => void;
  onRegionChange?: (region: MapRegion) => void;
  colorScheme?: "light" | "dark";
}

export interface SelectDestinationsMapRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  animateToCoordinate: (coordinate: { latitude: number; longitude: number }) => void;
}

export const SelectDestinationsMap = forwardRef<SelectDestinationsMapRef, SelectDestinationsMapProps>(
  function SelectDestinationsMap(
    {
      markers,
      selectedDestinations,
      initialRegion,
      onMarkerPress,
      onRegionChange,
      colorScheme = "light",
    },
    ref
  ) {
    const mapRef = useRef<MapView>(null);
    const colors = Colors[colorScheme];
    const mapColors = MapColors[colorScheme];

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

    const getOrderForMarker = useCallback(
      (markerId: string): number | null => {
        const dest = selectedDestinations.find(d => d.place.id === markerId);
        return dest ? dest.order : null;
      },
      [selectedDestinations]
    );

    return (
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {markers.map((marker) => {
            const order = getOrderForMarker(marker.id);
            const isSelected = order !== null;

            return (
              <Marker
                key={marker.id}
                identifier={marker.id}
                coordinate={marker.coordinate}
                title={marker.title}
                description={marker.description}
                onPress={() => onMarkerPress?.(marker.id)}
                tracksViewChanges={false}
              >
                <View style={styles.markerContainer}>
                  {isSelected ? (
                    <View style={[styles.selectedMarker, { backgroundColor: colors.error }]}>
                      <Text style={styles.markerNumber}>{order}</Text>
                    </View>
                  ) : (
                    <View style={[styles.defaultMarker, { backgroundColor: colors.info }]}>
                      <MaterialIcons
                        name="place"
                        size={16}
                        color="#fff"
                      />
                    </View>
                  )}
                </View>
              </Marker>
            );
          })}
        </MapView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  defaultMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
