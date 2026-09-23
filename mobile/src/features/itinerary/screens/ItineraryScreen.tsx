// ItineraryScreen.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BorderRadius, Colors, Shadows, Spacing } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks/useColorScheme";
import { fetchItineraries } from "../services/itineraryService";
import type { Itinerary, ItineraryStatus } from "../types/itinerary.types";

type ItineraryTab = ItineraryStatus;

const TABS: { key: ItineraryTab; label: string }[] = [
  { key: "ongoing", label: "Đang diễn ra" },
  { key: "upcoming", label: "Sắp tới" },
  { key: "past", label: "Đã đi" },
];

const SUGGESTIONS = [
  "Quán cà phê gần đây",
  "Quán cá viên chiên gần đây",
  "Khám phá quanh đây",
];

export function ItineraryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme] as (typeof Colors)["light"];
  const [activeTab, setActiveTab] = useState<ItineraryTab>("ongoing");
  const [trips, setTrips] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewTripBanner, setShowNewTripBanner] = useState(false);
  const [newlyCreatedTrip, setNewlyCreatedTrip] = useState<Itinerary | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, []),
  );

  const loadTrips = async () => {
    setIsLoading(true);
    try {
      // Fetch all trips from API
      const allTrips = await fetchItineraries();
      setTrips(allTrips);

      // Note: New trip banner logic can be implemented using createdAt from API
      // For now, disabled as we're using API data
      setShowNewTripBanner(false);
      setNewlyCreatedTrip(null);
    } catch (error) {
      console.error("Failed to load trips:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => trip.status === activeTab);
  }, [trips, activeTab]);

  const tabStyles = useMemo(
    () => ({
      activeBg: colors.info,
      activeText: "#fff",
      inactiveBg: colors.muted,
      inactiveText: colors.text,
      border: colors.borderLight ?? colors.border,
    }),
    [colors],
  );

  const renderContent = () => {
    // Show trip list if there are trips for this tab
    if (filteredTrips.length > 0) {
      return (
        <View>
          {/* New Trip Banner */}
          {showNewTripBanner &&
            activeTab === "upcoming" &&
            newlyCreatedTrip && (
              <View
                style={[
                  styles.bannerCard,
                  { backgroundColor: "#E3F2FD", borderColor: "#2196F3" },
                ]}
              >
                <Ionicons name="information-circle" size={20} color="#2196F3" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerTitle, { color: "#1976D2" }]}>
                    Lịch trình mới tạo gần đây
                  </Text>
                  <Text style={[styles.bannerSubtitle, { color: "#1976D2" }]}>
                    {newlyCreatedTrip.stops?.[0]?.name || "Điểm đến"} •{" "}
                    {new Date(newlyCreatedTrip.startDate).toLocaleDateString(
                      "vi-VN",
                    )}{" "}
                    • {newlyCreatedTrip.stops?.length || 0} điểm đến
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowNewTripBanner(false);
                      router.push({
                        pathname: "/(modals)/itinerary-detail" as any,
                        params: { tripId: newlyCreatedTrip.id },
                      });
                    }}
                  >
                    <Text style={[styles.bannerLink, { color: "#2196F3" }]}>
                      Xem lại lịch trình
                    </Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setShowNewTripBanner(false)}>
                  <Ionicons name="close" size={20} color="#1976D2" />
                </Pressable>
              </View>
            )}

          {/* Trip List Header */}
          <View style={styles.listHeader}>
            <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
              Danh sách chuyến đi
            </Text>
            <Pressable
              style={styles.aiButton}
              onPress={() => router.push("/(modals)/ai-itinerary" as any)}
            >
              <Ionicons name="sparkles" size={16} color="#FF6B6B" />
              <Text style={[styles.aiButtonText, { color: colors.info }]}>
                Gợi ý bằng AI
              </Text>
            </Pressable>
          </View>

          {/* Trip Cards */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.info} />
            </View>
          ) : (
            filteredTrips.map((trip) => {
              const tripDate = new Date(trip.startDate);

              return (
                <Pressable
                  key={trip.id}
                  style={[
                    styles.tripCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    // If trip is ongoing, go to active trip screen
                    if (trip.status === "ongoing") {
                      router.push({
                        pathname: "/(modals)/active-trip" as any,
                        params: { tripId: trip.id },
                      });
                    } else if (trip.status === "past") {
                      // If trip is past, go to completed trip screen
                      router.push({
                        pathname: "/(modals)/completed-trip" as any,
                        params: { tripId: trip.id },
                      });
                    } else {
                      // Otherwise go to detail screen
                      router.push({
                        pathname: "/(modals)/itinerary-detail" as any,
                        params: { tripId: trip.id },
                      });
                    }
                  }}
                >
                  <View style={styles.tripCardHeader}>
                    <Text
                      style={[styles.tripCardTitle, { color: colors.text }]}
                    >
                      {trip.title}
                    </Text>
                    {activeTab === "upcoming" && (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: "#FFE5E5" },
                        ]}
                      >
                        <Text
                          style={[styles.statusBadgeText, { color: "#FF4444" }]}
                        >
                          MỚI
                        </Text>
                      </View>
                    )}
                    {activeTab === "past" && (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: "#E8F5E9" },
                        ]}
                      >
                        <Text
                          style={[styles.statusBadgeText, { color: "#4CAF50" }]}
                        >
                          Hoàn thành
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.tripCardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.metaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {tripDate.toLocaleDateString("vi-VN")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripCardMeta}>
                    <View style={styles.metaItem}>
                      <Text
                        style={[
                          styles.metaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {trip.stops?.length || 0} điểm đến
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripCardMeta}>
                    <Ionicons name="location" size={14} color="#4CAF50" />
                    <Text
                      style={[styles.metaText, { color: colors.textSecondary }]}
                    >
                      {trip.locations?.[0] || "Vị trí hiện tại"}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      );
    }

    // Empty states
    if (activeTab === "upcoming") {
      return (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: "rgba(59, 130, 246, 0.1)" },
            ]}
          >
            <Ionicons name="calendar-outline" size={48} color="#3b82f6" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Bạn đã lên kế hoạch gì cho sắp tới chưa?
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: colors.textSecondary ?? colors.icon },
            ]}
          >
            Lên lịch trước để app nhắc giờ đi, check-in và gợi ý địa{"\n"}điểm
            phù hợp.
          </Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.info }]}
            onPress={() => router.push("/(modals)/create-itinerary")}
          >
            <Text style={styles.primaryButtonText}>Lên kế hoạch chuyến đi</Text>
          </Pressable>
        </View>
      );
    }

    if (activeTab === "past") {
      return (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: "rgba(59, 130, 246, 0.1)" },
            ]}
          >
            <Ionicons name="time-outline" size={48} color="#3b82f6" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Nhật ký hành trình của bạn vẫn còn trống
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: colors.textSecondary ?? colors.icon },
            ]}
          >
            Các chuyến đi đã hoàn thành sẽ xuất hiện tại đây để bạn{"\n"}xem lại
            và tạo lại lịch trình tương tự.
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card ?? "#fff",
            borderColor: colors.border,
          },
        ]}
      >
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?w=800&auto=format&fit=crop&q=80",
          }}
          style={styles.hero}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Bạn muốn đi đâu hôm nay?
          </Text>
          <Text
            style={[
              styles.cardSubtitle,
              { color: colors.textSecondary ?? colors.icon },
            ]}
          >
            Chưa có lịch trình nào được tạo. Hãy bắt đầu bằng cách chọn điểm đến
            hoặc để AI gợi ý hành trình phù hợp với bạn.
          </Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.info }]}
            onPress={() => router.push("/(modals)/create-itinerary")}
          >
            <Text style={styles.primaryButtonText}>Tạo chuyến đi mới</Text>
          </Pressable>
          <Pressable
            style={[
              styles.secondaryButton,
              { borderColor: colors.info, backgroundColor: colors.background },
            ]}
            onPress={() => router.push("/(modals)/ai-itinerary" as any)}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.info }]}>
              Gợi ý lịch trình bằng AI
            </Text>
          </Pressable>
          <View style={styles.suggestionRow}>
            {SUGGESTIONS.map((tag) => (
              <Pressable
                key={tag}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    marginHorizontal: 4,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary ?? colors.icon },
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: colors.textPrimary ?? colors.text }]}
          >
            Lịch trình của tôi
          </Text>
        </View>

        <View
          style={[
            styles.tabList,
            {
              backgroundColor: colors.backgroundSecondary ?? colors.muted,
              borderColor: tabStyles.border,
            },
          ]}
        >
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive
                      ? tabStyles.activeBg
                      : tabStyles.inactiveBg,
                    borderColor: tabStyles.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive
                        ? tabStyles.activeText
                        : tabStyles.inactiveText,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {renderContent()}
      </ScrollView>

      {/* Floating Action Button with Gradient */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/(modals)/create-itinerary")}
      >
        <LinearGradient
          colors={["#3b82f6", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md - 4,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs - 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  tabList: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.card,
  },
  hero: {
    width: "100%",
    height: 170,
  },
  cardBody: {
    padding: Spacing.cardPadding,
    gap: Spacing.sm + 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    paddingVertical: Spacing.buttonPadding,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    ...Shadows.sm,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: Spacing.buttonPadding,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: Spacing.md - 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl + 32,
    paddingHorizontal: Spacing.screenPadding + 8,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md + 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg + 4,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md - 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.screenPadding,
    gap: Spacing.sm + 2,
    ...Shadows.sm,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  bannerLink: {
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md - 4,
    marginTop: Spacing.xs,
  },
  listHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.pill,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  aiButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tripCard: {
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md - 4,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  tripCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tripCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tripCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md - 6,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    ...Shadows.sm,
  },
  viewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: Spacing.screenPadding + 4,
    bottom: Spacing.lg + 4,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    ...Shadows.lg,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
