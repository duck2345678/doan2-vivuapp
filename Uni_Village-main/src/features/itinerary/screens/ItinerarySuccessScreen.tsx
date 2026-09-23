import { useTheme } from "@/providers/ThemeProvider";
import { Colors } from "@/shared/constants";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchItineraries } from "@/features/itinerary/services/itineraryService";

interface Destination {
  id: string;
  name: string;
  thumbnail: string;
  order: number;
}

export default function ItinerarySuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Safely parse destinations
  const destinations: Destination[] = React.useMemo(() => {
    try {
      if (params.destinations && typeof params.destinations === "string") {
        return JSON.parse(params.destinations);
      }
      return [];
    } catch (error) {
      console.error("Failed to parse destinations:", error);
      return [];
    }
  }, [params.destinations]);
  const { colorScheme } = useTheme();
  const colors = Colors[colorScheme];

  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [tripNumber, setTripNumber] = useState(1);

  // Load trip count from API
  useEffect(() => {
    const loadTripCount = async () => {
      try {
        const trips = await fetchItineraries();
        setTripNumber(trips.length);
      } catch (error) {
        console.error("Failed to load trip count:", error);
      }
    };
    loadTripCount();
  }, []);

  useEffect(() => {
    // Scale animation for check icon
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  const handleViewItinerary = () => {
    router.push({
      pathname: "/(modals)/itinerary-detail" as any,
      params: {
        tripId: params.tripId as string,
        tripName: (params.tripName as string) || "Chuyến đi #4",
        startDate: (params.startDate as string) || new Date().toISOString(),
        startTime: (params.startTime as string) || new Date().toISOString(),
        destinations: (params.destinations as string) || JSON.stringify([]),
      },
    });
  };

  const handleGoHome = () => {
    router.replace("/(tabs)/itinerary");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: "#4CAF50",
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Ionicons name="checkmark" size={48} color="#FFFFFF" />
        </Animated.View>

        {/* Success Message */}
        <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
          <Text style={[styles.title, { color: colors.text }]}>
            Tạo lịch trình thành công! 🎉
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Lịch trình của bạn tại chi tiết đang chờ bạn{"\n"}cùng bạn bè trải
            nghiệm!
          </Text>
        </Animated.View>

        {/* Itinerary Preview Card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardBadge,
                {
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(59, 130, 246, 0.2)"
                      : "#E3F2FD",
                },
              ]}
            >
              <Ionicons name="calendar" size={14} color={colors.info} />
              <Text style={[styles.cardBadgeText, { color: colors.info }]}>
                Chuyến đi #{tripNumber}
              </Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.cardText, { color: colors.text }]}>
              {params.startDate
                ? new Date(params.startDate as string).toLocaleDateString(
                    "vi-VN",
                  )
                : ""}{" "}
              •{" "}
              {params.startTime
                ? new Date(params.startTime as string).toLocaleTimeString(
                    "vi-VN",
                    { hour: "2-digit", minute: "2-digit" },
                  )
                : ""}
            </Text>
          </View>

          <View style={styles.cardRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.cardText, { color: colors.text }]}>
              {destinations[0]?.name || "Điểm đến"}
            </Text>
          </View>
          <Text
            style={[styles.cardDestinations, { color: colors.textSecondary }]}
          >
            {destinations.length} địa điểm đã chọn
          </Text>

          <View style={styles.cardRow}>
            <Ionicons
              name="pricetag-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.cardText, { color: colors.text }]}>
              Sở thích
            </Text>
          </View>
          <Text
            style={[styles.cardDestinations, { color: colors.textSecondary }]}
          >
            Vì lí hơn em
          </Text>

          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Các điểm đến trong lịch trình
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.previewImagesScroll}
          >
            <View style={styles.previewImages}>
              {destinations.slice(0, 5).map((dest) => (
                <Image
                  key={dest.id}
                  source={{ uri: dest.thumbnail }}
                  style={[
                    styles.previewImage,
                    { backgroundColor: colors.muted },
                  ]}
                  resizeMode="cover"
                />
              ))}
            </View>
          </ScrollView>
          <Text style={[styles.previewPlaceName, { color: colors.text }]}>
            {destinations
              .map((d) => d.name)
              .slice(0, 3)
              .join(", ")}
            {destinations.length > 3 ? "..." : ""}
          </Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={{ opacity: fadeAnim, width: "100%", gap: 12 }}>
          <Pressable
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: colors.info },
            ]}
            onPress={handleViewItinerary}
          >
            <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Xem lịch trình chi tiết</Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.secondaryButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            onPress={handleGoHome}
          >
            <Ionicons name="home-outline" size={20} color={colors.text} />
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Quay về trang chủ
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  cardBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 14,
    fontWeight: "500",
  },
  cardDestinations: {
    fontSize: 14,
    marginLeft: 24,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
    marginBottom: 12,
  },
  previewImagesScroll: {
    marginBottom: 8,
  },
  previewImages: {
    flexDirection: "row",
    gap: 8,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  previewPlaceName: {
    fontSize: 13,
    fontWeight: "500",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    borderWidth: 1.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
