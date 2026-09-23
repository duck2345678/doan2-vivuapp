import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
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
  checkInAtDestination,
  completeItinerary,
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
  time?: string;
  isCheckedIn?: boolean;
  isSkipped?: boolean;
  checkedInAt?: string;
  googlePlaceId?: string;
  lat?: number;
  lng?: number;
  placeId?: number;
  address?: string;
}

interface TripData {
  id: string;
  tripName: string;
  startDate: string;
  startTime: string;
  destinations: Destination[];
}

// Local storage for check-in states (not stored on backend yet)
const checkInStates: Record<
  string,
  { isCheckedIn: boolean; isSkipped: boolean; checkedInAt?: string }
> = {};

export function ActiveTripScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [tripData, setTripData] = useState<TripData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEndTripModal, setShowEndTripModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showSkipConfirmModal, setShowSkipConfirmModal] = useState(false);
  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "checkin" | "navigate" | null
  >(null);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editTripName, setEditTripName] = useState("");

  // Reload data when screen is focused (e.g., returning from add destinations)
  useFocusEffect(
    useCallback(() => {
      loadTripData();
    }, [params.tripId]),
  );

  const loadTripData = async () => {
    try {
      setIsLoading(true);
      const tripId = params.tripId as string;

      if (tripId) {
        const itinerary = await getItineraryById(tripId);

        if (itinerary) {
          setTripData({
            id: itinerary.id,
            tripName: itinerary.title,
            startDate: itinerary.startDate,
            startTime: itinerary.startDate,
            destinations: (itinerary.stops || []).map((stop) => {
              const storedState = checkInStates[stop.id] || {};
              return {
                id: stop.id,
                name: stop.name,
                thumbnail: stop.imageUrl,
                order: stop.order,
                googlePlaceId: stop.googlePlaceId,
                lat: stop.lat,
                lng: stop.lng,
                address: stop.address,
                isCheckedIn: storedState.isCheckedIn || false,
                isSkipped: storedState.isSkipped || false,
                checkedInAt: storedState.checkedInAt,
              };
            }),
          });
        }
      }
    } catch (error) {
      console.error("Failed to load trip:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async (destinationId: string) => {
    if (!tripData) return;

    // Update local check-in state
    checkInStates[destinationId] = {
      ...checkInStates[destinationId],
      isSkipped: true,
    };

    const updatedDestinations = tripData.destinations.map((d) =>
      d.id === destinationId ? { ...d, isSkipped: true } : d,
    );

    setTripData({
      ...tripData,
      destinations: updatedDestinations,
    });
  };

  const hasPreviousUnchecked = (destination: Destination): boolean => {
    if (!tripData) return false;

    const destIndex = tripData.destinations.findIndex(
      (d) => d.id === destination.id,
    );
    // Check if any previous destination is not checked in and not skipped
    for (let i = 0; i < destIndex; i++) {
      const prevDest = tripData.destinations[i];
      if (!prevDest.isCheckedIn && !prevDest.isSkipped) {
        return true;
      }
    }
    return false;
  };

  const handleCheckIn = async (destinationId: string) => {
    if (!tripData) return;

    const destination = tripData.destinations.find(
      (d) => d.id === destinationId,
    );
    if (!destination) return;

    // Check if there are previous unchecked destinations
    if (hasPreviousUnchecked(destination)) {
      setSelectedDestination(destination);
      setPendingAction("checkin");
      setShowSkipConfirmModal(true);
      return;
    }

    // No previous unchecked, proceed with check-in
    setSelectedDestination(destination);
    setShowCheckInModal(true);
  };

  const handleNavigate = (destination: Destination) => {
    if (!tripData) return;

    // Check if there are previous unchecked destinations
    if (hasPreviousUnchecked(destination)) {
      setSelectedDestination(destination);
      setPendingAction("navigate");
      setShowSkipConfirmModal(true);
      return;
    }

    // No previous unchecked, proceed with navigation
    router.push({
      pathname: "/(modals)/navigation" as any,
      params: {
        destinationName: destination.name,
        destinationImage: destination.thumbnail,
        destinationLat: destination.lat?.toString() || "10.7630",
        destinationLng: destination.lng?.toString() || "106.6830",
      },
    });
  };

  const handleSkipConfirm = async () => {
    if (!tripData || !selectedDestination) return;

    // Do NOT mark previous destinations as skipped
    // User just confirms they want to proceed to this destination
    // They can still go back and check-in previous destinations later

    setShowSkipConfirmModal(false);

    // Execute pending action
    if (pendingAction === "checkin") {
      setShowCheckInModal(true);
    } else if (pendingAction === "navigate") {
      router.push({
        pathname: "/(modals)/navigation" as any,
        params: {
          destinationName: selectedDestination.name,
          destinationImage: selectedDestination.thumbnail,
          destinationLat: selectedDestination.lat?.toString() || "10.7630",
          destinationLng: selectedDestination.lng?.toString() || "106.6830",
        },
      });
    }

    setPendingAction(null);
  };

  const confirmCheckIn = async () => {
    if (!tripData || !selectedDestination) return;

    const now = new Date().toISOString();

    // Update local check-in state
    checkInStates[selectedDestination.id] = {
      isCheckedIn: true,
      isSkipped: false,
      checkedInAt: now,
    };

    const updatedDestinations = tripData.destinations.map((d) =>
      d.id === selectedDestination.id
        ? { ...d, isCheckedIn: true, checkedInAt: now }
        : d,
    );

    setTripData({
      ...tripData,
      destinations: updatedDestinations,
    });

    // Call API to record check-in (if placeId available)
    try {
      if (selectedDestination.placeId) {
        await checkInAtDestination(
          selectedDestination.placeId,
          parseInt(tripData.id),
          parseInt(selectedDestination.id),
        );
      }
    } catch (error) {
      console.error("Failed to record check-in:", error);
    }

    setShowCheckInModal(false);
    setSelectedDestination(null);
  };

  const handleEndTrip = () => {
    const uncheckedCount =
      tripData?.destinations.filter((d) => !d.isCheckedIn && !d.isSkipped)
        .length || 0;
    if (uncheckedCount > 0) {
      setShowEndTripModal(true);
    } else {
      // All destinations completed, end trip directly
      confirmEndTrip();
    }
  };

  const confirmEndTrip = async () => {
    if (!tripData) return;

    try {
      // Complete the trip via API
      await completeItinerary(tripData.id);

      // Navigate to completed trip screen with success
      router.replace({
        pathname: "/(modals)/completed-trip" as any,
        params: {
          tripId: tripData.id,
          showSuccess: "true", // Flag to show success popup
        },
      });
    } catch (error) {
      console.error("Failed to end trip:", error);
      Alert.alert("Lỗi", "Không thể kết thúc chuyến đi. Vui lòng thử lại.");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSaveTripName = async () => {
    if (!tripData || !editTripName.trim()) return;

    try {
      // Update via API
      await updateItinerary(tripData.id, { name: editTripName.trim() });

      setTripData({ ...tripData, tripName: editTripName.trim() });
      setShowEditNameModal(false);
    } catch (error) {
      console.error("Failed to update trip name:", error);
      Alert.alert("Lỗi", "Không thể cập nhật tên chuyến đi. Vui lòng thử lại.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.info} />
        </View>
      </SafeAreaView>
    );
  }

  if (!tripData) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Text
          style={{ color: colors.text, textAlign: "center", marginTop: 50 }}
        >
          Không tìm thấy chuyến đi
        </Text>
      </SafeAreaView>
    );
  }

  const uncheckedCount = tripData.destinations.filter(
    (d) => !d.isCheckedIn && !d.isSkipped,
  ).length;
  const totalDestinations = tripData.destinations.length;
  const allCompleted = uncheckedCount === 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      {/* Header with gradient */}
      <LinearGradient
        colors={["#3b82f6", "#2563eb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <Pressable
          onPress={() => router.replace("/(tabs)/itinerary")}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Lịch trình của tôi</Text>
        </View>

        <Pressable
          style={styles.settingsButton}
          onPress={() => {
            if (tripData) {
              setEditTripName(tripData.tripName);
              setShowEditNameModal(true);
            }
          }}
        >
          <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trip Header Card with gradient badge */}
        <View
          style={[
            styles.tripHeaderCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.tripHeaderTop}>
            <Text style={[styles.tripTitle, { color: colors.text }]}>
              {tripData.tripName}
            </Text>
            <LinearGradient
              colors={["#22c55e", "#16a34a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBadge}
            >
              <Ionicons name="navigate-circle" size={14} color="#FFFFFF" />
              <Text style={styles.statusBadgeText}>Đang diễn ra</Text>
            </LinearGradient>
          </View>

          <Text style={[styles.tripDate, { color: colors.textSecondary }]}>
            {formatDate(tripData.startDate)} • {totalDestinations} điểm dừng
          </Text>
        </View>

        {/* Destinations Timeline */}
        <View style={styles.timelineContainer}>
          {tripData.destinations.map((dest, index) => {
            const isFirst = index === 0;
            const isLast = index === tripData.destinations.length - 1;
            const isCheckedIn = dest.isCheckedIn;
            const isSkipped = dest.isSkipped;
            // Allow any destination to be "current" if not checked in or skipped
            const isCurrent = !isCheckedIn && !isSkipped;

            return (
              <View key={dest.id} style={styles.timelineItem}>
                {/* Timeline Line & Circle */}
                <View style={styles.timelineLeft}>
                  {!isFirst && (
                    <View
                      style={[
                        styles.timelineLine,
                        styles.timelineLineTop,
                        {
                          backgroundColor:
                            isCheckedIn || isSkipped
                              ? isCheckedIn
                                ? "#4CAF50"
                                : "#9E9E9E"
                              : colors.border,
                        },
                      ]}
                    />
                  )}
                  {isCurrent && !isCheckedIn && !isSkipped ? (
                    <LinearGradient
                      colors={["#f59e0b", "#ea580c"]}
                      style={styles.timelineCircle}
                    >
                      <Ionicons
                        name="radio-button-on"
                        size={18}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.timelineCircle,
                        {
                          backgroundColor: isCheckedIn
                            ? "#22c55e"
                            : dest.isSkipped
                              ? "#9E9E9E"
                              : colors.border,
                          borderColor: isCheckedIn
                            ? "#22c55e"
                            : dest.isSkipped
                              ? "#9E9E9E"
                              : colors.border,
                        },
                      ]}
                    >
                      {isCheckedIn && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                      {dest.isSkipped && (
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  )}
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        styles.timelineLineBottom,
                        {
                          backgroundColor:
                            isCheckedIn || isSkipped
                              ? isCheckedIn
                                ? "#4CAF50"
                                : "#9E9E9E"
                              : colors.border,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Destination Card */}
                <View
                  style={[
                    styles.destinationCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isCurrent ? "#FF9800" : colors.border,
                      borderWidth: isCurrent ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.destinationHeader}>
                    <Text
                      style={[styles.destinationTime, { color: colors.text }]}
                    >
                      {dest.time || `${8 + index}:00`}
                    </Text>
                    <Text
                      style={[styles.destinationName, { color: colors.text }]}
                    >
                      {dest.name}
                    </Text>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>
                          Điểm kế tiếp
                        </Text>
                      </View>
                    )}
                    {!isCheckedIn && !dest.isSkipped && (
                      <Pressable
                        onPress={() => handleSkip(dest.id)}
                        style={styles.skipButton}
                      >
                        <Ionicons name="close" size={20} color="#FF9800" />
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.destinationContent}>
                    <Image
                      source={{ uri: dest.thumbnail }}
                      style={styles.destinationImage}
                    />

                    <View style={styles.destinationInfo}>
                      <View style={styles.statusRow}>
                        {isCheckedIn ? (
                          <>
                            <View style={styles.statusTag}>
                              <Text
                                style={[
                                  styles.statusTagText,
                                  { color: "#4CAF50" },
                                ]}
                              >
                                Cả phê
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.statusTag,
                                { backgroundColor: "#FFEBEE" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusTagText,
                                  { color: "#F44336" },
                                ]}
                              >
                                Rẻ chục
                              </Text>
                            </View>
                          </>
                        ) : isCurrent ? (
                          <>
                            <View
                              style={[
                                styles.statusTag,
                                { backgroundColor: "#FFF3E0" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusTagText,
                                  { color: "#FF9800" },
                                ]}
                              >
                                Tên lớn
                              </Text>
                            </View>
                          </>
                        ) : (
                          <>
                            <View
                              style={[
                                styles.statusTag,
                                { backgroundColor: "#FFEBEE" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusTagText,
                                  { color: "#F44336" },
                                ]}
                              >
                                Ăn uống
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.statusTag,
                                { backgroundColor: "#FFEBEE" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusTagText,
                                  { color: "#F44336" },
                                ]}
                              >
                                Nhà hàng
                              </Text>
                            </View>
                          </>
                        )}
                      </View>

                      <View style={styles.ratingRow}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={[styles.ratingText, { color: colors.text }]}
                        >
                          Xuất phát: {dest.time}
                        </Text>
                        <Ionicons
                          name="star"
                          size={14}
                          color="#FFB800"
                          style={{ marginLeft: 8 }}
                        />
                        <Text
                          style={[styles.ratingText, { color: colors.text }]}
                        >
                          {dest.rating || 4.6}
                        </Text>
                      </View>

                      {isCurrent && (
                        <View style={styles.actionButtons}>
                          <Pressable
                            style={[
                              styles.actionButton,
                              { backgroundColor: colors.info },
                            ]}
                            onPress={() => handleNavigate(dest)}
                          >
                            <Ionicons
                              name="navigate"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.actionButtonText}>
                              Chỉ đường
                            </Text>
                          </Pressable>

                          <Pressable
                            style={[
                              styles.actionButton,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                borderWidth: 1,
                              },
                            ]}
                            onPress={() => handleCheckIn(dest.id)}
                          >
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={16}
                              color={colors.text}
                            />
                            <Text
                              style={[
                                styles.actionButtonText,
                                { color: colors.text },
                              ]}
                            >
                              Check-in
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      {isCheckedIn && (
                        <View style={styles.checkedInRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#4CAF50"
                          />
                          <Text
                            style={[styles.checkedInText, { color: "#4CAF50" }]}
                          >
                            Đã check-in
                          </Text>
                        </View>
                      )}

                      {dest.isSkipped && (
                        <View style={styles.checkedInRow}>
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color="#9E9E9E"
                          />
                          <Text
                            style={[styles.checkedInText, { color: "#9E9E9E" }]}
                          >
                            Đã bỏ qua
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Buttons with gradients */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        {/* Add Destinations Button */}
        <Pressable
          style={styles.addButtonWrapper}
          onPress={() => {
            if (tripData) {
              router.push({
                pathname: "/(modals)/select-destinations" as any,
                params: {
                  tripId: tripData.id,
                  tripName: tripData.tripName,
                  startDate: tripData.startDate,
                  startTime: tripData.startTime,
                  existingDestinations: JSON.stringify(tripData.destinations),
                  isAddingToExisting: "true",
                },
              });
            }
          }}
        >
          <View style={[styles.addButton, { borderColor: colors.info }]}>
            <Ionicons name="add-circle-outline" size={20} color={colors.info} />
            <Text style={[styles.addButtonText, { color: colors.info }]}>
              Thêm địa điểm mới
            </Text>
          </View>
        </Pressable>

        {/* End Trip Button with gradient */}
        <Pressable style={styles.endButtonWrapper} onPress={handleEndTrip}>
          <LinearGradient
            colors={
              allCompleted ? ["#22c55e", "#16a34a"] : ["#ef4444", "#dc2626"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.endButton}
          >
            <Ionicons
              name={allCompleted ? "checkmark-circle" : "stop-circle"}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.endButtonText}>
              {allCompleted ? "Hoàn thành & Đóng" : "Kết thúc chuyến đi"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Skip Confirmation Modal */}
      <Modal
        visible={showSkipConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSkipConfirmModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSkipConfirmModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Ionicons
                name="information-circle-outline"
                size={48}
                color="#2196F3"
              />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Thông báo
              </Text>
              <Text
                style={[styles.modalMessage, { color: colors.textSecondary }]}
              >
                Bạn chưa check-in các địa điểm trước. Bạn có muốn check in địa
                điểm này không ?!
              </Text>
              {selectedDestination && (
                <View
                  style={[
                    styles.destinationPreview,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: selectedDestination.thumbnail }}
                    style={styles.previewImage}
                  />
                  <View style={styles.previewInfo}>
                    <Text
                      style={[styles.previewName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {selectedDestination.name}
                    </Text>
                    <Text
                      style={[
                        styles.previewAddress,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      Địa điểm bạn đang chọn
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.modalButtons}>
              <Pressable
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  setShowSkipConfirmModal(false);
                  setSelectedDestination(null);
                  setPendingAction(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Hủy
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#2196F3" }]}
                onPress={handleSkipConfirm}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                  Xác nhận
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Check-in Confirmation Modal */}
      {showCheckInModal && selectedDestination && (
        <Modal
          visible={showCheckInModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCheckInModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowCheckInModal(false)}
            />
            <View
              style={[
                styles.checkInModalContent,
                { backgroundColor: colors.card },
              ]}
            >
              <Pressable
                onPress={() => setShowCheckInModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.icon} />
              </Pressable>

              <Text style={[styles.checkInModalTitle, { color: colors.text }]}>
                Check-in tại địa điểm
              </Text>

              <View style={styles.checkInDestinationCard}>
                <Image
                  source={{ uri: selectedDestination.thumbnail }}
                  style={styles.checkInDestinationImage}
                  resizeMode="cover"
                />
                <View style={styles.checkInDestinationInfo}>
                  <Text
                    style={[
                      styles.checkInDestinationName,
                      { color: colors.text },
                    ]}
                  >
                    {selectedDestination.name}
                  </Text>
                  <View style={styles.checkInBadgeRow}>
                    <View
                      style={[
                        styles.checkInBadge,
                        { backgroundColor: "#E3F2FD" },
                      ]}
                    >
                      <Text
                        style={[styles.checkInBadgeText, { color: "#2196F3" }]}
                      >
                        Cà phê
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkInBadge,
                        { backgroundColor: "#FFE5E5" },
                      ]}
                    >
                      <Text
                        style={[styles.checkInBadgeText, { color: "#FF4444" }]}
                      >
                        Nổi bật
                      </Text>
                    </View>
                  </View>
                  {selectedDestination.rating && (
                    <View style={styles.checkInRatingRow}>
                      <Ionicons name="star" size={16} color="#FFB800" />
                      <Text
                        style={[
                          styles.checkInRatingText,
                          { color: colors.text },
                        ]}
                      >
                        {selectedDestination.rating}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Text
                style={[styles.checkInNote, { color: colors.textSecondary }]}
              >
                Bạn đang ở địa điểm này. Xác nhận check-in?
              </Text>

              <Pressable
                style={[
                  styles.checkInConfirmButton,
                  { backgroundColor: "#4CAF50" },
                ]}
                onPress={confirmCheckIn}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.checkInConfirmText}>Check-in tại đây</Text>
              </Pressable>

              <Pressable
                style={styles.checkInCancelButton}
                onPress={() => setShowCheckInModal(false)}
              >
                <Text
                  style={[
                    styles.checkInCancelText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Huỷ
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* End Trip Confirmation Modal */}
      <Modal
        visible={showEndTripModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndTripModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEndTripModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Xác nhận kết thúc chuyến đi
              </Text>
              <Pressable onPress={() => setShowEndTripModal(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </Pressable>
            </View>

            <Text
              style={[styles.modalMessage, { color: colors.textSecondary }]}
            >
              Vẫn còn {uncheckedCount} điểm chưa ghé. Bạn có chắc muốn kết thúc
              chuyến đi?
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setShowEndTripModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Tiếp tục chuyến đi
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, { backgroundColor: "#F44336" }]}
                onPress={() => {
                  setShowEndTripModal(false);
                  confirmEndTrip();
                }}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                  Kết thúc
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Chỉnh sửa tên chuyến đi
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

            <View style={styles.modalButtons}>
              <Pressable
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setShowEditNameModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Hủy
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.info }]}
                onPress={handleSaveTripName}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screenPadding,
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  tripHeaderCard: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.screenPadding,
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    ...Shadows.card,
  },
  tripHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md - 4,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  tripDate: {
    fontSize: 14,
  },
  timelineContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.screenPadding,
    paddingBottom: 140,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: Spacing.screenPadding,
  },
  timelineLeft: {
    width: 32,
    alignItems: "center",
    marginRight: Spacing.md - 4,
  },
  timelineLine: {
    width: 3,
    flex: 1,
  },
  timelineLineTop: {
    marginBottom: -2,
  },
  timelineLineBottom: {
    marginTop: -2,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md - 4,
    gap: Spacing.md - 4,
    ...Shadows.card,
  },
  destinationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  destinationTime: {
    fontSize: 15,
    fontWeight: "600",
  },
  destinationName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  currentBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    color: "#FF9800",
    fontSize: 11,
    fontWeight: "600",
  },
  skipButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  destinationContent: {
    flexDirection: "row",
    gap: 12,
  },
  destinationImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  destinationInfo: {
    flex: 1,
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  statusTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  checkedInRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  checkedInText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md - 4,
    ...Shadows.lg,
  },
  addButtonWrapper: {
    borderRadius: BorderRadius.lg,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm - 2,
    paddingVertical: Spacing.md - 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  endButtonWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.buttonPadding + 2,
    borderRadius: BorderRadius.lg,
  },
  endButtonText: {
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
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  checkInModalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  checkInModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  checkInDestinationCard: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  checkInDestinationImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  checkInDestinationInfo: {
    flex: 1,
    gap: 6,
  },
  checkInDestinationName: {
    fontSize: 16,
    fontWeight: "700",
  },
  checkInBadgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  checkInBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  checkInBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  checkInRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  checkInRatingText: {
    fontSize: 14,
    fontWeight: "600",
  },
  checkInNote: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  checkInConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkInConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  checkInCancelButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  checkInCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  destinationPreview: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    width: "100%",
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  previewInfo: {
    flex: 1,
    justifyContent: "center",
  },
  previewName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  previewAddress: {
    fontSize: 13,
  },
});
