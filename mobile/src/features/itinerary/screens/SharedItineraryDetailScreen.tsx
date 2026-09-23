import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BorderRadius, Colors, Shadows, Spacing } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { createItinerary } from "../services/itineraryService";

interface SharedDestination {
  id: string;
  name: string;
  thumbnail?: string;
  time?: string;
  address?: string;
  order: number;
  rating?: number;
  reviewCount?: number;
  distance?: number;
  googlePlaceId?: string;
  lat?: number;
  lng?: number;
}

interface SharedTripData {
  id: string;
  tripName: string;
  startDate: string;
  startTime: string;
  destinations: SharedDestination[];
  area?: string;
}

export function SharedItineraryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [tripData, setTripData] = useState<SharedTripData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTripData();
  }, []);

  const loadTripData = () => {
    try {
      const tripDataParam = params.tripData as string;
      if (tripDataParam) {
        const parsed = JSON.parse(tripDataParam);
        setTripData(parsed);
      }
    } catch (error) {
      console.error("Failed to parse trip data:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${dayName}, ${day}/${month}/${year}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const handleUseTrip = async () => {
    if (!tripData || isSaving) return;

    setIsSaving(true);

    try {
      // Tạo chuyến đi mới từ dữ liệu chia sẻ
      const now = new Date();
      const createdTrip = await createItinerary({
        name: tripData.tripName,
        description: `Sao chép từ lịch trình được chia sẻ`,
        startDate: now,
        startTime: now,
        googlePlaceStops: tripData.destinations?.map((dest, index) => ({
          googlePlaceId: dest.googlePlaceId || `shared-${dest.id}`,
          placeName: dest.name,
          address: dest.address,
          latitude: dest.lat,
          longitude: dest.lng,
          imageUrl: dest.thumbnail,
          sequenceOrder: index + 1,
        })),
      });

      Alert.alert(
        "Thành công! 🎉",
        `Đã thêm "${createdTrip.title}" vào danh sách chuyến đi của bạn.`,
        [
          {
            text: "Xem ngay",
            onPress: () => {
              router.back();
              setTimeout(() => {
                router.push({
                  pathname: "/(modals)/itinerary-detail",
                  params: { tripId: createdTrip.id },
                });
              }, 300);
            },
          },
          {
            text: "Đóng",
            onPress: () => router.back(),
            style: "cancel",
          },
        ],
      );
    } catch (error) {
      console.error("Failed to save trip:", error);
      Alert.alert("Lỗi", "Không thể lưu chuyến đi. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!tripData) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Text
          style={{ color: colors.text, textAlign: "center", marginTop: 20 }}
        >
          Đang tải...
        </Text>
      </SafeAreaView>
    );
  }

  const destinations = tripData.destinations || [];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      {/* Header with gradient background - same as ItineraryDetailScreen */}
      <LinearGradient
        colors={["#3b82f6", "#2563eb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CHIA SẺ</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {tripData.tripName}
            </Text>
          </View>

          <View style={styles.backButton} />
        </View>

        {/* Date and Time */}
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeItem}>
            <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
            <Text style={styles.dateTimeText}>
              {formatDate(tripData.startDate)}
            </Text>
          </View>
          <View style={styles.dateTimeItem}>
            <Ionicons name="time-outline" size={16} color="#FFFFFF" />
            <Text style={styles.dateTimeText}>
              {formatTime(tripData.startTime)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Starting Point */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate" size={20} color="#4CAF50" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Điểm xuất phát
            </Text>
          </View>
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            {tripData.area || "TP.HCM"}
          </Text>
        </View>

        {/* Destinations - same layout as ItineraryDetailScreen */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, marginBottom: 12 },
            ]}
          >
            Điểm đến ({destinations.length})
          </Text>

          {destinations.map((dest, index) => (
            <View
              key={dest.id || index}
              style={[
                styles.destinationCard,
                { borderBottomColor: colors.border },
                index === destinations.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.destinationNumber}>
                <Text style={styles.destinationNumberText}>{index + 1}</Text>
              </View>

              {dest.thumbnail ? (
                <Image
                  source={{ uri: dest.thumbnail }}
                  style={styles.destinationImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.destinationImagePlaceholder,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="image-outline"
                    size={24}
                    color={colors.textSecondary}
                  />
                </View>
              )}

              <View style={styles.destinationInfo}>
                <Text
                  style={[styles.destinationName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {dest.name}
                </Text>

                <View style={styles.destinationMeta}>
                  {dest.rating && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#FFB800" />
                      <Text style={[styles.ratingText, { color: colors.text }]}>
                        {dest.rating}
                      </Text>
                      {dest.reviewCount && (
                        <Text
                          style={[
                            styles.reviewText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          ({dest.reviewCount})
                        </Text>
                      )}
                    </View>
                  )}

                  {dest.address && (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.metaText,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {dest.address}
                      </Text>
                    </View>
                  )}

                  {dest.time && (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.metaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {dest.time}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Info Section */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.infoRow}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.info}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Lịch trình này được chia sẻ từ cộng đồng. Nhấn nút bên dưới để
              thêm vào danh sách chuyến đi của bạn.
            </Text>
          </View>
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Button with gradient - same as ItineraryDetailScreen */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          style={[styles.startButtonWrapper, isSaving && styles.buttonDisabled]}
          onPress={handleUseTrip}
          disabled={isSaving}
        >
          <LinearGradient
            colors={["#22c55e", "#16a34a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButton}
          >
            <Ionicons
              name={isSaving ? "hourglass" : "add-circle"}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.startButtonText}>
              {isSaving ? "Đang lưu..." : "Sử dụng chuyến đi này"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: Spacing.screenPadding,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md - 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: Spacing.md - 4,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
    maxWidth: 250,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg - 4,
    paddingHorizontal: Spacing.screenPadding,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateTimeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  section: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.screenPadding,
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 28,
  },
  destinationCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md - 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md - 4,
  },
  destinationNumber: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  destinationNumberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  destinationImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
  },
  destinationImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  destinationName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  destinationMeta: {
    gap: Spacing.xs,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  reviewText: {
    fontSize: 13,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md - 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  startButtonWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.buttonPadding + 2,
    borderRadius: BorderRadius.lg,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
