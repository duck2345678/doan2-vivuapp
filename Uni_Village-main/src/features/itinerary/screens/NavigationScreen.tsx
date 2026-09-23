/**
 * NavigationScreen - Google Maps Style Navigation
 *
 * CURRENT STATUS: Using MOCK DATA
 *
 * TO ENABLE REAL GOOGLE MAPS:
 * 1. Get API key from: https://console.cloud.google.com/
 * 2. Add to .env: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
 * 3. Uncomment real API calls in: src/lib/maps/googleMapsService.ts
 * 4. See full guide: docs/GOOGLE_MAPS_SETUP.md
 *
 * FEATURES:
 * - Real-time navigation with turn-by-turn instructions
 * - Route visualization on map
 * - Distance and duration calculation
 * - Current location tracking with pulse animation
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUserLocation } from "@/features/map/hooks/useUserLocation";
import { getDirections, type Location, type NavigationRoute } from "@/lib/maps";
import { Colors, useColorScheme } from "@/shared";

const { width, height } = Dimensions.get("window");

export function NavigationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // Use real user location
  const { location: userLocation, requestPermission } = useUserLocation({
    enableWatch: true,
  });

  const [currentLocation, setCurrentLocation] = useState<Location>({
    latitude: 10.762622,
    longitude: 106.660172,
  });

  // Update current location when user location changes
  useEffect(() => {
    if (userLocation) {
      setCurrentLocation({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
    } else {
      // Request permission on mount
      requestPermission();
    }
  }, [userLocation]);

  const [destinationLocation] = useState<Location>(() => {
    const lat = parseFloat(params.destinationLat as string);
    const lng = parseFloat(params.destinationLng as string);

    // Log for debugging
    console.log("🧭 Navigation destination params:", {
      raw: { lat: params.destinationLat, lng: params.destinationLng },
      parsed: { lat, lng },
    });

    return {
      latitude: !isNaN(lat) ? lat : 10.773996,
      longitude: !isNaN(lng) ? lng : 106.657663,
    };
  });

  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(true);

  const destinationName = (params.destinationName as string) || "Điểm đến";
  const destinationImage = (params.destinationImage as string) || "";

  // Load route when component mounts or location changes
  useEffect(() => {
    if (currentLocation) {
      console.log("🧭 Loading route:", {
        from: currentLocation,
        to: destinationLocation,
      });
      loadRoute();
    }
  }, [currentLocation]);

  const loadRoute = async () => {
    try {
      setLoading(true);
      // This will use mock data now, but will use real Google API when you add API key
      const routeData = await getDirections(
        currentLocation,
        destinationLocation,
      );
      setRoute(routeData);
    } catch (error) {
      console.error("Failed to load route:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Pulse animation for current location
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Get current step instructions
  const currentStep = route?.steps[currentStepIndex];

  const startNavigation = () => {
    setIsNavigating(true);
    setCurrentStepIndex(0);
    // TODO: Start real-time location tracking
    // TODO: Update currentStepIndex based on user progress
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setCurrentStepIndex(0);
  };

  const handleBack = () => {
    if (isNavigating) {
      stopNavigation();
    }
    router.back();
  };

  if (loading || !route) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.icon} />
          </Pressable>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Đang tải tuyến đường...
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude:
            (currentLocation.latitude + destinationLocation.latitude) / 2,
          longitude:
            (currentLocation.longitude + destinationLocation.longitude) / 2,
          latitudeDelta:
            Math.abs(currentLocation.latitude - destinationLocation.latitude) *
            2.5,
          longitudeDelta:
            Math.abs(
              currentLocation.longitude - destinationLocation.longitude,
            ) * 2.5,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Current Location Marker with Pulse */}
        <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.currentLocationMarker}>
            <Animated.View
              style={[
                styles.currentLocationPulse,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.currentLocationDot} />
          </View>
        </Marker>

        {/* Destination Marker */}
        <Marker coordinate={destinationLocation} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.destinationMarker}>
            <View style={styles.destinationPin}>
              <Ionicons name="location" size={32} color="#FF4444" />
            </View>
          </View>
        </Marker>

        {/* Route Polyline */}
        <Polyline
          coordinates={route.polylinePoints}
          strokeColor="#4285F4"
          strokeWidth={6}
          lineDashPattern={[0]}
        />
      </MapView>

      {/* Top Info Bar */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>

        <View style={styles.topInfoContainer}>
          <View style={styles.topInfoLeft}>
            <Text style={styles.durationText}>{route.duration}</Text>
            <Text style={styles.distanceText}>{route.distance}</Text>
          </View>

          <View style={styles.topInfoRight}>
            <Pressable style={styles.topIconButton}>
              <Ionicons name="volume-high" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.topIconButton}>
              <MaterialIcons name="more-vert" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Navigation Instructions */}
      {isNavigating && currentStep && (
        <View
          style={[styles.instructionCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.instructionIcon}>
            <MaterialIcons name="arrow-upward" size={32} color="#4285F4" />
          </View>
          <View style={styles.instructionContent}>
            <Text style={[styles.instructionDistance, { color: colors.text }]}>
              {currentStep.distance}
            </Text>
            <Text
              style={[styles.instructionText, { color: colors.textSecondary }]}
            >
              {currentStep.instruction}
            </Text>
          </View>
        </View>
      )}

      {/* Destination Info Card */}
      <View style={[styles.destinationCard, { backgroundColor: colors.card }]}>
        {destinationImage ? (
          <Image
            source={{ uri: destinationImage }}
            style={styles.destinationImage}
          />
        ) : (
          <View
            style={[
              styles.destinationImagePlaceholder,
              { backgroundColor: colors.border },
            ]}
          >
            <Ionicons name="location" size={32} color={colors.icon} />
          </View>
        )}

        <View style={styles.destinationInfo}>
          <Text style={[styles.destinationName, { color: colors.text }]}>
            {destinationName}
          </Text>
          <View style={styles.destinationMeta}>
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text
              style={[
                styles.destinationMetaText,
                { color: colors.textSecondary },
              ]}
            >
              {route.duration} • {route.distance}
            </Text>
          </View>
        </View>

        <Pressable style={styles.destinationOptions}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.icon} />
        </Pressable>
      </View>

      {/* Bottom Action Buttons */}
      <View
        style={[styles.bottomActions, { backgroundColor: colors.background }]}
      >
        {!isNavigating ? (
          <>
            <Pressable
              style={[
                styles.actionButton,
                styles.previewButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {
                /* Preview route */
              }}
            >
              <MaterialIcons name="preview" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Xem trước
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.startButton]}
              onPress={startNavigation}
            >
              <MaterialIcons name="navigation" size={20} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Bắt đầu</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[
                styles.actionButton,
                styles.stopButton,
                { backgroundColor: "#FF4444" },
              ]}
              onPress={stopNavigation}
            >
              <Ionicons name="stop" size={20} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>Dừng</Text>
            </Pressable>

            <Pressable
              style={[
                styles.quickActionButton,
                { backgroundColor: colors.card },
              ]}
              onPress={async () => {
                try {
                  const phoneNumber = "tel:1900XXXX"; // Replace with actual phone number
                  const canCall = await Linking.canOpenURL(phoneNumber);
                  if (canCall) {
                    await Linking.openURL(phoneNumber);
                  } else {
                    Alert.alert("Lỗi", "Không thể thực hiện cuộc gọi");
                  }
                } catch (error) {
                  console.error("Call error:", error);
                  Alert.alert("Lỗi", "Không thể thực hiện cuộc gọi");
                }
              }}
            >
              <Ionicons name="call" size={20} color={colors.text} />
            </Pressable>

            <Pressable
              style={[
                styles.quickActionButton,
                { backgroundColor: colors.card },
              ]}
              onPress={async () => {
                try {
                  const destinationName = params.destinationName || "Điểm đến";
                  const distance = route?.distance || "";
                  const duration = route?.duration || "";

                  await Share.share({
                    message: `🗺️ Đang đi đến: ${destinationName}\n📍 Khoảng cách: ${distance}\n⏱️ Thời gian: ${duration}\n\nVị trí: https://maps.google.com/?q=${destinationLocation.latitude},${destinationLocation.longitude}`,
                    title: `Điều hướng đến ${destinationName}`,
                  });
                } catch (error) {
                  console.error("Share error:", error);
                }
              }}
            >
              <Ionicons name="share-social" size={20} color={colors.text} />
            </Pressable>
          </>
        )}
      </View>

      {/* Recenter Button */}
      <Pressable
        style={[styles.recenterButton, { backgroundColor: colors.card }]}
      >
        <MaterialIcons name="my-location" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 20,
  },
  map: {
    width: width,
    height: height,
  },
  currentLocationMarker: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  currentLocationPulse: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(66, 133, 244, 0.3)",
  },
  currentLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4285F4",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  destinationMarker: {
    alignItems: "center",
  },
  destinationPin: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  topInfoContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topInfoLeft: {
    flex: 1,
  },
  durationText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  distanceText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 2,
  },
  topInfoRight: {
    flexDirection: "row",
    gap: 8,
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  instructionCard: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  instructionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F4FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  instructionContent: {
    flex: 1,
  },
  instructionDistance: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  destinationCard: {
    position: "absolute",
    bottom: 140,
    left: 16,
    right: 16,
    flexDirection: "row",
    padding: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  destinationImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  destinationImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  destinationName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  destinationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  destinationMetaText: {
    fontSize: 13,
  },
  destinationOptions: {
    padding: 8,
    justifyContent: "center",
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  previewButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  startButton: {
    backgroundColor: "#4285F4",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  stopButton: {
    flex: 2,
  },
  stopButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  quickActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recenterButton: {
    position: "absolute",
    bottom: 220,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
});
