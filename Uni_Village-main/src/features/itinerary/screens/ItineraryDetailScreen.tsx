import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BorderRadius, Colors, Shadows, Spacing } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import {
  createItinerary,
  getItineraryById,
  updateItinerary,
} from "../services/itineraryService";

interface Destination {
  id: string;
  name: string;
  thumbnail?: string;
  order: number;
  rating?: number;
  reviewCount?: number;
  distance?: number;
  departureTime?: string;
  time?: string;
  googlePlaceId?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

interface TripData {
  id: string;
  tripName: string;
  startDate: Date;
  startTime: Date;
  destinations: Destination[];
}

export function ItineraryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [tripData, setTripData] = useState<TripData>({
    id: "",
    tripName: "Chuyến đi",
    startDate: new Date(),
    startTime: new Date(),
    destinations: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editTripName, setEditTripName] = useState("");
  const modalOpacity = React.useRef(new Animated.Value(0)).current;

  // Load trip data from API when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadTripData();
    }, [params.tripId]),
  );

  const loadTripData = async () => {
    try {
      setIsLoading(true);
      const tripId = params.tripId as string;
      const isAiGenerated = params.isAiGenerated === "true";
      const tripName = params.tripName as string;
      const destinationsParam = params.destinations as string;
      const startDateParam = params.startDate as string;

      // Handle AI-generated itinerary from params (not yet saved to backend)
      if (isAiGenerated && destinationsParam) {
        try {
          const parsedDestinations = JSON.parse(destinationsParam);
          setTripData({
            id: "", // No backend ID yet - will be created when user saves
            tripName: tripName || "Lịch trình AI",
            startDate: startDateParam ? new Date(startDateParam) : new Date(),
            startTime: startDateParam ? new Date(startDateParam) : new Date(),
            destinations: parsedDestinations.map(
              (dest: any, index: number) => ({
                id: dest.id || `ai-${index}`,
                name: dest.name,
                thumbnail: dest.thumbnail || "",
                order: dest.order || index + 1,
                time: dest.time,
                lat: dest.lat,
                lng: dest.lng,
                address: dest.address,
              }),
            ),
          });
          return;
        } catch (parseError) {
          console.error("Failed to parse AI destinations:", parseError);
        }
      }

      if (tripId) {
        // Load from API
        const itinerary = await getItineraryById(tripId);

        if (itinerary) {
          setTripData({
            id: itinerary.id,
            tripName: itinerary.title,
            startDate: new Date(itinerary.startDate),
            startTime: new Date(itinerary.startDate), // Backend combines date/time
            destinations: (itinerary.stops || []).map((stop) => ({
              id: stop.id,
              name: stop.name,
              thumbnail: stop.imageUrl,
              order: stop.order,
              googlePlaceId: stop.googlePlaceId,
              lat: stop.lat,
              lng: stop.lng,
              address: stop.address,
            })),
          });
          return;
        }
      }

      // Fallback to empty trip
      setTripData({
        id: tripId || "",
        tripName: "Chuyến đi",
        startDate: new Date(),
        startTime: new Date(),
        destinations: [],
      });
    } catch (error) {
      console.error("Failed to load trip data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const days = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${dayName}, ${day}/${month}/${year}`;
  };

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const updateTripDateTime = async (newDate: Date, newTime: Date) => {
    try {
      const tripId = tripData.id;
      if (!tripId) return;

      // Update local state
      setTripData({
        ...tripData,
        startDate: newDate,
        startTime: newTime,
      });

      // Update via API
      await updateItinerary(tripId, {
        startDate: newDate,
        startTime: newTime,
      });
    } catch (error) {
      console.error("Failed to update trip date/time:", error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (
      selectedDate &&
      selectedDate >= new Date(new Date().setHours(0, 0, 0, 0))
    ) {
      updateTripDateTime(selectedDate, tripData.startTime);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      updateTripDateTime(tripData.startDate, selectedTime);
    }
  };

  React.useEffect(() => {
    Animated.timing(modalOpacity, {
      toValue: showDateTimeModal ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [showDateTimeModal]);

  const handleStartTrip = async () => {
    try {
      let tripId = tripData.id;
      const isAiGenerated = params.isAiGenerated === "true";

      // If AI-generated itinerary without backend ID, create it first
      if (!tripId && isAiGenerated && tripData.destinations.length > 0) {
        // Create the tour in backend with AI-generated destinations
        const newItinerary = await createItinerary({
          name: tripData.tripName,
          description: "Lịch trình được tạo bởi AI",
          startDate: tripData.startDate,
          startTime: tripData.startTime,
          googlePlaceStops: tripData.destinations.map((dest, index) => ({
            googlePlaceId: dest.googlePlaceId || `ai-place-${index}`,
            placeName: dest.name,
            address: dest.address,
            latitude: dest.lat,
            longitude: dest.lng,
            sequenceOrder: dest.order || index + 1,
          })),
        });
        tripId = newItinerary.id;
        // Update local state with the new ID
        setTripData((prev) => ({ ...prev, id: tripId }));
      }

      if (!tripId) {
        console.error("No tripId provided");
        return;
      }

      // Start the trip via API (change status to ONGOING)
      const { startItinerary } = await import("../services/itineraryService");
      await startItinerary(tripId);

      // Navigate to active trip screen
      router.push({
        pathname: "/(modals)/active-trip" as any,
        params: { tripId },
      });
    } catch (error) {
      console.error("Failed to start trip:", error);
    }
  };

  const handleShare = async () => {
    try {
      const destinationsList = tripData.destinations
        .map((d, i) => `${i + 1}. ${d.name}`)
        .join("\n");

      const message =
        `🎉 Lịch trình: ${tripData.tripName}\n\n` +
        `📅 Ngày: ${formatDate(tripData.startDate)}\n` +
        `⏰ Giờ: ${formatTime(tripData.startTime)}\n\n` +
        `📍 Điểm đến (${tripData.destinations.length}):\n${destinationsList}\n\n` +
        `Tạo bằng Uni Village App 🚀`;

      await Share.share({
        message,
      });
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const handleSaveTripName = async () => {
    if (!editTripName.trim()) return;

    try {
      const tripId = tripData.id;
      if (!tripId) return;

      // Update local state
      setTripData({ ...tripData, tripName: editTripName.trim() });

      // Update via API
      await updateItinerary(tripId, { name: editTripName.trim() });

      setShowEditNameModal(false);
    } catch (error) {
      console.error("Failed to update trip name:", error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      {/* Header with gradient background */}
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
              <Text style={styles.badgeText}>SẮP TỚI</Text>
            </View>
            <Text style={styles.headerTitle}>{tripData.tripName}</Text>
          </View>

          <Pressable onPress={handleShare} style={styles.backButton}>
            <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Date and Time */}
        <View style={styles.dateTimeRow}>
          <Pressable
            style={styles.dateTimeItem}
            onPress={() => {
              if (Platform.OS === "ios") {
                setShowDateTimeModal(true);
              } else {
                setShowDatePicker(true);
              }
            }}
          >
            <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
            <Text style={styles.dateTimeText}>
              {formatDate(tripData.startDate)}
            </Text>
            <Ionicons name="create-outline" size={14} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={styles.dateTimeItem}
            onPress={() => {
              if (Platform.OS === "ios") {
                setShowDateTimeModal(true);
              } else {
                setShowTimePicker(true);
              }
            }}
          >
            <Ionicons name="time-outline" size={16} color="#FFFFFF" />
            <Text style={styles.dateTimeText}>
              {formatTime(tripData.startTime)}
            </Text>
            <Ionicons name="create-outline" size={14} color="#FFFFFF" />
          </Pressable>
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
            Vị trí hiện tại
          </Text>
        </View>

        {/* Destinations */}
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
            Điểm đến ({tripData.destinations.length})
          </Text>

          {tripData.destinations.map((dest, index) => (
            <Pressable
              key={dest.id}
              style={[
                styles.destinationCard,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.destinationNumber}>
                <Text style={styles.destinationNumberText}>{dest.order}</Text>
              </View>

              <Image
                source={{ uri: dest.thumbnail }}
                style={styles.destinationImage}
                resizeMode="cover"
              />

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

                  {dest.distance && (
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
                      >
                        Cách {dest.distance} km
                      </Text>
                    </View>
                  )}

                  {dest.departureTime && (
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
                        Xuất phát: {dest.departureTime}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={colors.icon} />
            </Pressable>
          ))}
        </View>

        {/* Actions Section */}
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
            Thao tác
          </Text>

          <Pressable
            style={styles.actionRow}
            onPress={() => {
              setEditTripName(tripData.tripName);
              setShowEditNameModal(true);
            }}
          >
            <Ionicons name="create-outline" size={20} color={colors.info} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Đổi tên chuyến đi
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable
            style={styles.actionRow}
            onPress={() => {
              router.push({
                pathname: "/(modals)/select-destinations" as any,
                params: {
                  tripId: params.tripId as string,
                  tripName: tripData.tripName,
                  startDate: tripData.startDate.toString(),
                  startTime: tripData.startTime.toString(),
                  existingDestinations: JSON.stringify(tripData.destinations),
                  isAddingToExisting: "true",
                },
              });
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.info} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Thêm địa điểm mới
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable style={styles.actionRow} onPress={handleShare}>
            <Ionicons
              name="share-social-outline"
              size={20}
              color={colors.icon}
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Chia sẻ lịch trình
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Button with gradient */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Pressable style={styles.startButtonWrapper} onPress={handleStartTrip}>
          <LinearGradient
            colors={["#22c55e", "#16a34a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButton}
          >
            <Ionicons name="play-circle" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Bắt đầu chuyến đi</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Android Date Picker */}
      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tripData.startDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {/* Android Time Picker */}
      {showTimePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tripData.startTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* iOS Date & Time Modal */}
      {showDateTimeModal && Platform.OS === "ios" && (
        <Modal
          visible={showDateTimeModal}
          transparent
          animationType="none"
          onRequestClose={() => setShowDateTimeModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDateTimeModal(false)}
          >
            <Animated.View
              style={[
                styles.dateTimeModalContent,
                {
                  backgroundColor: colors.card,
                  opacity: modalOpacity,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Chọn ngày & giờ
                </Text>
                <Pressable onPress={() => setShowDateTimeModal(false)}>
                  <Ionicons name="close" size={24} color={colors.icon} />
                </Pressable>
              </View>

              <View style={styles.pickerSection}>
                <Text
                  style={[styles.pickerLabel, { color: colors.textSecondary }]}
                >
                  Ngày khởi hành
                </Text>
                <DateTimePicker
                  value={tripData.startDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  themeVariant={colorScheme}
                  onChange={handleDateChange}
                  style={styles.picker}
                />
              </View>

              <View style={styles.pickerSection}>
                <Text
                  style={[styles.pickerLabel, { color: colors.textSecondary }]}
                >
                  Giờ xuất phát
                </Text>
                <DateTimePicker
                  value={tripData.startTime}
                  mode="time"
                  display="spinner"
                  themeVariant={colorScheme}
                  onChange={handleTimeChange}
                  style={styles.picker}
                />
              </View>

              <Pressable
                style={[styles.doneButton, { backgroundColor: colors.info }]}
                onPress={() => setShowDateTimeModal(false)}
              >
                <Text style={styles.doneButtonText}>Xong</Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}

      {/* Edit Trip Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditNameModal(false)}
        >
          <Pressable
            style={[styles.editNameModal, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.editNameTitle, { color: colors.text }]}>
              Đổi tên chuyến đi
            </Text>

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={editTripName}
              onChangeText={setEditTripName}
              placeholder="Nhập tên chuyến đi"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />

            <View style={styles.editNameButtons}>
              <Pressable
                style={[
                  styles.editNameButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setShowEditNameModal(false)}
              >
                <Text
                  style={[styles.editNameButtonText, { color: colors.text }]}
                >
                  Hủy
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.editNameButton,
                  { backgroundColor: colors.info },
                ]}
                onPress={handleSaveTripName}
              >
                <Text style={[styles.editNameButtonText, { color: "#FFFFFF" }]}>
                  Lưu
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md - 4,
    paddingVertical: Spacing.sm,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.screenPadding,
    marginVertical: Spacing.sm,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dateTimeModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  pickerSection: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  picker: {
    width: "100%",
  },
  doneButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  editNameModal: {
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  editNameTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  editNameButtons: {
    flexDirection: "row",
    gap: 12,
  },
  editNameButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  editNameButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
