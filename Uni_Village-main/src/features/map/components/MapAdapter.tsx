/**
 * MapAdapter - Enhanced Map Component
 *
 * Features:
 * - Map type switching (standard/satellite/hybrid)
 * - Custom minimal map style for reduced visual noise
 * - Polyline with stroke for better visibility
 * - Performance optimizations for Android markers
 * - Camera animation support
 */

import { Colors, MapColors, Shadows } from "@/shared/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, {
  Camera,
  MapType,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import type {
  MapMarker,
  MapRegion,
  PlaceCategory,
  UserLocation,
} from "../types";

/** Coordinate for polyline rendering */
export interface PolylineCoord {
  latitude: number;
  longitude: number;
}

export interface MapAdapterProps {
  markers: MapMarker[];
  selectedMarkerId?: string | null;
  userLocation?: UserLocation | null;
  initialRegion: MapRegion;
  /** Map display type */
  mapType?: "standard" | "satellite" | "hybrid";
  /** Route polyline coordinates */
  routePolyline?: PolylineCoord[];
  /** Polyline color (default: theme routePolyline) */
  polylineColor?: string;
  /** Show polyline stroke/outline */
  showPolylineStroke?: boolean;
  /** Hide business POIs for cleaner view during navigation */
  hideBusinessPOI?: boolean;
  /** Camera pitch for 3D view (0-60 degrees) */
  cameraPitch?: number;
  /** Camera heading/bearing (0-360 degrees) */
  cameraHeading?: number;
  onMarkerPress?: (markerId: string) => void;
  onRegionChange?: (region: MapRegion) => void;
  onMapPress?: () => void;
  showsUserLocation?: boolean;
  /** Show traffic layer overlay */
  showsTraffic?: boolean;
  colorScheme?: "light" | "dark";
}

export interface MapAdapterRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  animateToCoordinate: (coordinate: {
    latitude: number;
    longitude: number;
  }) => void;
  animateCamera: (camera: Partial<Camera>, duration?: number) => void;
  getCamera: () => Promise<Camera | undefined>;
}

/**
 * Custom map style to reduce visual noise
 * - Hides business POIs
 * - Reduces vegetation saturation
 * - Emphasizes roads
 */
const MINIMAL_MAP_STYLE = [
  // Hide business POIs
  {
    featureType: "poi.business",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  // Hide attraction POIs
  {
    featureType: "poi.attraction",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  // Reduce vegetation color intensity
  {
    featureType: "landscape.natural",
    elementType: "geometry.fill",
    stylers: [{ saturation: -30 }, { lightness: 10 }],
  },
  // Emphasize roads
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ saturation: -20 }, { lightness: 5 }],
  },
  // Increase road label visibility
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ weight: 0.5 }],
  },
];

/**
 * Navigation mode map style - even cleaner
 */
const NAVIGATION_MAP_STYLE = [
  ...MINIMAL_MAP_STYLE,
  // Hide all POIs during navigation
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  // Hide transit stations
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
];

function getMarkerColor(
  category: PlaceCategory,
  isSelected: boolean,
  colorScheme: "light" | "dark"
): string {
  if (isSelected) {
    return MapColors[colorScheme].markerSelected;
  }
  return MapColors[colorScheme].markerDefault;
}

function getCategoryIcon(category: PlaceCategory): string {
  const iconMap: Record<PlaceCategory, string> = {
    home: "home",
    restaurant: "restaurant",
    hotel: "hotel",
    shopping: "shopping-bag",
    cafe: "local-cafe",
    entertainment: "sports-esports",
    education: "school",
    other: "place",
  };
  return iconMap[category] || "place";
}

/**
 * Memoized Marker component for performance
 */
const MapMarkerItem = memo(function MapMarkerItem({
  marker,
  isSelected,
  colorScheme,
  onPress,
}: {
  marker: MapMarker;
  isSelected: boolean;
  colorScheme: "light" | "dark";
  onPress: () => void;
}) {
  const markerColor = getMarkerColor(marker.category, isSelected, colorScheme);

  return (
    <Marker
      identifier={marker.id}
      coordinate={marker.coordinate}
      title={marker.title}
      description={marker.description}
      onPress={onPress}
      // Performance: Disable view tracking on Android once marker is rendered
      tracksViewChanges={Platform.OS === "ios"}
    >
      <View
        style={[
          styles.markerContainer,
          isSelected && styles.markerContainerSelected,
          { backgroundColor: markerColor },
        ]}
      >
        <MaterialIcons
          name={getCategoryIcon(marker.category) as any}
          size={isSelected ? 20 : 16}
          color="#fff"
        />
      </View>
    </Marker>
  );
});

export const MapAdapter = forwardRef<MapAdapterRef, MapAdapterProps>(
  function MapAdapter(
    {
      markers,
      selectedMarkerId,
      userLocation,
      initialRegion,
      mapType = "standard",
      routePolyline,
      polylineColor,
      showPolylineStroke = true,
      hideBusinessPOI = false,
      cameraPitch,
      cameraHeading,
      onMarkerPress,
      onRegionChange,
      onMapPress,
      showsUserLocation = true,
      showsTraffic = false,
      colorScheme = "light",
    },
    ref
  ) {
    const mapRef = useRef<MapView>(null);
    const mapColors = MapColors[colorScheme];

    // Determine polyline colors
    const strokeColor = mapColors.routePolylineStroke;
    const routeColor = polylineColor || mapColors.routePolyline;

    // Convert mapType prop to react-native-maps MapType
    const mapTypeValue: MapType = useMemo(() => {
      switch (mapType) {
        case "satellite":
          return "satellite";
        case "hybrid":
          return "hybrid";
        default:
          return "standard";
      }
    }, [mapType]);

    // Select appropriate map style
    const customMapStyle = useMemo(() => {
      if (mapType !== "standard") return undefined;
      return hideBusinessPOI ? NAVIGATION_MAP_STYLE : MINIMAL_MAP_STYLE;
    }, [mapType, hideBusinessPOI]);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region: MapRegion, duration = 500) => {
        mapRef.current?.animateToRegion(region, duration);
      },
      animateToCoordinate: (coordinate: {
        latitude: number;
        longitude: number;
      }) => {
        mapRef.current?.animateToRegion(
          {
            ...coordinate,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500
        );
      },
      animateCamera: (camera: Partial<Camera>, duration = 500) => {
        mapRef.current?.animateCamera(camera, { duration });
      },
      getCamera: async () => {
        return mapRef.current?.getCamera();
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

    const handleMarkerPress = useCallback(
      (markerId: string) => {
        onMarkerPress?.(markerId);
      },
      [onMarkerPress]
    );

    // Initial camera with pitch/heading if provided
    const initialCamera: Camera | undefined = useMemo(() => {
      if (cameraPitch !== undefined || cameraHeading !== undefined) {
        return {
          center: {
            latitude: initialRegion.latitude,
            longitude: initialRegion.longitude,
          },
          pitch: cameraPitch ?? 0,
          heading: cameraHeading ?? 0,
          zoom: 15,
        };
      }
      return undefined;
    }, [initialRegion, cameraPitch, cameraHeading]);

    return (
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          mapType={mapTypeValue}
          customMapStyle={customMapStyle}
          initialRegion={!initialCamera ? initialRegion : undefined}
          initialCamera={initialCamera}
          showsUserLocation={showsUserLocation}
          showsMyLocationButton={false}
          showsCompass={false}
          showsTraffic={showsTraffic}
          showsBuildings={mapType === "satellite" || mapType === "hybrid"}
          showsIndoors={false}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPress={onMapPress}
          mapPadding={{ top: 120, right: 0, bottom: 200, left: 0 }}
          // Performance optimizations
          loadingEnabled
          moveOnMarkerPress={false}
          pitchEnabled
          rotateEnabled
        >
          {/* Render markers with memoization */}
          {markers.map((marker) => (
            <MapMarkerItem
              key={marker.id}
              marker={marker}
              isSelected={marker.id === selectedMarkerId}
              colorScheme={colorScheme}
              onPress={() => handleMarkerPress(marker.id)}
            />
          ))}

          {/* Route Polyline with Stroke (White outline) */}
          {routePolyline && routePolyline.length > 0 && showPolylineStroke && (
            <Polyline
              coordinates={routePolyline}
              strokeColor={strokeColor}
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Route Polyline (Inner color) */}
          {routePolyline && routePolyline.length > 0 && (
            <Polyline
              coordinates={routePolyline}
              strokeColor={routeColor}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>
      </View>
    );
  }
);

/**
 * Mock Map View for testing/fallback
 */
export function MockMapView({
  markers,
  selectedMarkerId,
  onMarkerPress,
  colorScheme = "light",
}: Pick<
  MapAdapterProps,
  "markers" | "selectedMarkerId" | "onMarkerPress" | "colorScheme"
>) {
  return (
    <View style={[styles.container, styles.mockContainer]}>
      <View style={styles.mockMapBackground}>
        <MaterialIcons
          name="map"
          size={120}
          color={Colors[colorScheme].muted}
        />
        <Text style={[styles.mockText, { color: Colors[colorScheme].text }]}>
          Map View
        </Text>
        <Text style={[styles.mockSubtext, { color: Colors[colorScheme].icon }]}>
          {markers.length} địa điểm gần đây
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  markerContainerSelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
  },
  mockContainer: {
    backgroundColor: "#e8f4f8",
  },
  mockMapBackground: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mockText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  mockSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});
