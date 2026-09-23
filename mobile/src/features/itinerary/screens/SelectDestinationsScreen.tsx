import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  SelectDestinationsMap,
  SelectDestinationsMapRef,
} from "@/features/itinerary/components/SelectDestinationsMap";
import {
  createItinerary,
  updateItinerary,
} from "@/features/itinerary/services/itineraryService";
import { useNearbyPlaces, useUserLocation } from "@/features/map/hooks";
import type { MapMarker, MapRegion, Place } from "@/features/map/types";
import { Colors, useColorScheme } from "@/shared";

interface SelectedDestination {
  place: Place;
  order: number;
  visitTime?: Date;
}

interface SelectDestinationsScreenProps {
  tripData?: {
    tripName: string;
    startDate: Date;
    startTime: Date;
    categories: string[];
  };
  tripId?: string;
  existingDestinations?: {
    id: string;
    name: string;
    thumbnail?: string;
    order: number;
    time?: string;
    isCheckedIn?: boolean;
    isSkipped?: boolean;
    checkedInAt?: string;
    googlePlaceId?: string;
    lat?: number;
    lng?: number;
    address?: string;
  }[];
  isAddingToExisting?: boolean;
  onBack?: () => void;
}

export function SelectDestinationsScreen({
  tripData,
  tripId,
  existingDestinations,
  isAddingToExisting,
  onBack,
}: SelectDestinationsScreenProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const secondaryTextColor = colors.textSecondary || (colors as any).icon;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<SelectDestinationsMapRef>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["30%", "65%", "90%"], []);

  // Get user location and nearby places from API
  const { location: userLocation } = useUserLocation();
  const { displayPlaces: nearbyPlaces, isLoading: isLoadingPlaces } =
    useNearbyPlaces(userLocation, "all", { radius: 2000, maxResults: 20 });

  // Initialize with existing destinations if adding to existing trip
  const [selectedDestinations, setSelectedDestinations] = useState<
    SelectedDestination[]
  >([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Update selected destinations when nearbyPlaces load and existingDestinations are provided
  useEffect(() => {
    if (
      isAddingToExisting &&
      existingDestinations &&
      existingDestinations.length > 0 &&
      !isInitialized
    ) {
      // Map existing destinations - try to find in nearbyPlaces or create from existing data
      const mapped = existingDestinations.map((dest) => {
        // First try to find by googlePlaceId
        let place = nearbyPlaces.find((p) => p.id === dest.googlePlaceId);

        // If not found by googlePlaceId, try by coordinates (within ~100m)
        if (!place && dest.lat && dest.lng) {
          place = nearbyPlaces.find((p) => {
            const latDiff = Math.abs(p.lat - (dest.lat || 0));
            const lngDiff = Math.abs(p.lng - (dest.lng || 0));
            return latDiff < 0.001 && lngDiff < 0.001; // ~100m tolerance
          });
        }

        // If not found, try by name
        if (!place) {
          place = nearbyPlaces.find(
            (p) => p.name.toLowerCase() === dest.name.toLowerCase(),
          );
        }

        // If still not found, create a virtual place from existing data
        // This ensures existing destinations always show even if not in nearbyPlaces
        if (!place) {
          place = {
            id: dest.googlePlaceId || dest.id,
            name: dest.name,
            lat: dest.lat || 0,
            lng: dest.lng || 0,
            address: dest.address || "",
            thumbnail: dest.thumbnail || "",
            category: "other" as const,
          };
        }

        return {
          place,
          order: dest.order,
          visitTime: dest.time
            ? (() => {
                const [hours, minutes] = dest.time.split(":");
                const date = new Date();
                date.setHours(parseInt(hours), parseInt(minutes));
                return date;
              })()
            : undefined,
        } as SelectedDestination;
      });
      setSelectedDestinations(mapped);
      setIsInitialized(true);
    }
  }, [
    isAddingToExisting,
    existingDestinations,
    nearbyPlaces.length,
    isInitialized,
  ]);

  // Store initial count to track if user made changes
  const initialDestinationCount = useRef(existingDestinations?.length || 0);

  const [searchQuery, setSearchQuery] = useState("");
  const [showTimePickerFor, setShowTimePickerFor] = useState<string | null>(
    null,
  );
  const [tempTime, setTempTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const confirmOpacity = useRef(new Animated.Value(0)).current;

  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return nearbyPlaces;
    return nearbyPlaces.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [nearbyPlaces, searchQuery]);

  // Map region - use user location when available
  const initialRegion: MapRegion = useMemo(
    () => ({
      latitude: userLocation?.latitude || 10.7626,
      longitude: userLocation?.longitude || 106.6824,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }),
    [userLocation],
  );

  // Convert places to markers
  const markers: MapMarker[] = useMemo(() => {
    return filteredPlaces.map((place) => ({
      id: place.id,
      coordinate: {
        latitude: place.lat,
        longitude: place.lng,
      },
      title: place.name,
      description: place.address,
      category: place.category,
    }));
  }, [filteredPlaces]);

  const getDestinationOrder = useCallback(
    (placeId: string): number | null => {
      const dest = selectedDestinations.find((d) => d.place.id === placeId);
      return dest ? dest.order : null;
    },
    [selectedDestinations.length], // Only depend on length to avoid infinite updates
  );

  const toggleDestination = useCallback((place: Place) => {
    setSelectedDestinations((prev) => {
      const existing = prev.find((d) => d.place.id === place.id);
      if (existing) {
        // Remove and reorder
        const filtered = prev.filter((d) => d.place.id !== place.id);
        return filtered.map((d, idx) => ({ ...d, order: idx + 1 }));
      } else {
        // Add to end with next order number
        const nextOrder = prev.length + 1;
        return [...prev, { place, order: nextOrder }];
      }
    });
  }, []);

  const isDirty = useMemo(() => {
    // If adding to existing trip, check if selection changed from initial
    if (isAddingToExisting) {
      return selectedDestinations.length !== initialDestinationCount.current;
    }
    // For new trips, any selection is considered dirty
    return selectedDestinations.length > 0;
  }, [selectedDestinations, isAddingToExisting]);

  const requestClose = useCallback(() => {
    if (showTimePickerFor) {
      setShowTimePickerFor(null);
      return;
    }
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [isDirty, onBack, showTimePickerFor]);

  const handleMarkerPress = useCallback(
    (markerId: string) => {
      // Find place from nearbyPlaces instead of filteredPlaces to avoid re-renders
      const place = nearbyPlaces.find((p) => p.id === markerId);
      if (place) {
        toggleDestination(place);
        mapRef.current?.animateToCoordinate({
          latitude: place.lat,
          longitude: place.lng,
        });
      }
    },
    [toggleDestination, nearbyPlaces],
  );

  const handleSetTime = useCallback(
    (placeId: string) => {
      const destination = selectedDestinations.find(
        (d) => d.place.id === placeId,
      );
      setShowTimePickerFor(placeId);
      setTempTime(destination?.visitTime || new Date());
      if (Platform.OS === "android") {
        setShowTimePicker(true);
      }
    },
    [], // Empty dependency array since we're just setting local state
  );

  const handleTimeConfirm = useCallback(() => {
    if (showTimePickerFor) {
      setSelectedDestinations((prev) =>
        prev.map((d) =>
          d.place.id === showTimePickerFor ? { ...d, visitTime: tempTime } : d,
        ),
      );
    }
    setShowTimePickerFor(null);
    setShowTimePicker(false);
  }, [showTimePickerFor, tempTime]);

  const handleBack = useCallback(() => {
    requestClose();
  }, [requestClose]);

  // Animate to user location when it becomes available
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToCoordinate({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
    }
  }, [userLocation]);

  // Confirm modal fade animation
  useEffect(() => {
    Animated.timing(confirmOpacity, {
      toValue: showDiscardConfirm ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [confirmOpacity, showDiscardConfirm]);

  // Handle Android hardware back
  useEffect(() => {
    const onBackPress = () => {
      if (showTimePickerFor) {
        setShowTimePickerFor(null);
        return true;
      }
      if (showDiscardConfirm) {
        setShowDiscardConfirm(false);
        return true;
      }
      requestClose();
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [requestClose, showDiscardConfirm, showTimePickerFor]);

  const formatTime = (date?: Date) => {
    if (!date) return "Chọn giờ";
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  return (
    <GestureHandlerRootView style={styles.flex}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Map - Full screen background */}
        <View style={styles.mapContainer}>
          <SelectDestinationsMap
            ref={mapRef}
            markers={markers}
            selectedDestinations={selectedDestinations}
            initialRegion={initialRegion}
            onMarkerPress={handleMarkerPress}
            colorScheme={colorScheme}
          />
        </View>

        {/* Header - Overlay on top */}
        <View
          style={[
            styles.headerSafeArea,
            {
              paddingTop: insets.top,
              backgroundColor: colors.background,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable onPress={handleBack} style={styles.headerIcon}>
              <Ionicons name="arrow-back" size={22} color={colors.icon} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {tripData?.tripName || "Chuyến đi #4"}
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: secondaryTextColor }]}
              >
                {isAddingToExisting
                  ? "Thêm địa điểm mới"
                  : "Bước 2/2: Chọn điểm đến"}
              </Text>
            </View>

            <Pressable onPress={requestClose} hitSlop={10}>
              <Text style={[styles.skipText, { color: colors.info }]}>
                Bỏ qua
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom Sheet with destinations list */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: colors.background ?? "#ffffff" }}
          handleIndicatorStyle={{ backgroundColor: colors.border ?? "#e2e8f0" }}
          enablePanDownToClose={false}
        >
          <BottomSheetScrollView
            contentContainerStyle={styles.bottomSheetContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Search bar */}
            <View style={styles.searchSection}>
              <View
                style={[
                  styles.searchBar,
                  {
                    backgroundColor: colors.card || "#fff",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="search" size={18} color={colors.icon} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Tìm địa điểm, quán ăn"
                  placeholderTextColor={secondaryTextColor}
                  style={[styles.searchInput, { color: colors.text }]}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={() => {
                    // Keyboard will dismiss automatically with blurOnSubmit
                  }}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.icon}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Địa điểm gợi ý quanh đây ({filteredPlaces.length})
              </Text>
              {selectedDestinations.length > 0 && (
                <Text style={[styles.selectedCount, { color: colors.info }]}>
                  Đã chọn: {selectedDestinations.length}
                </Text>
              )}
            </View>

            {/* Destination List */}
            <View style={styles.listSection}>
              {filteredPlaces.map((place) => {
                const order = getDestinationOrder(place.id);
                const isSelected = order !== null;
                const destination = selectedDestinations.find(
                  (d) => d.place.id === place.id,
                );

                return (
                  <View
                    key={place.id}
                    style={[
                      styles.placeCard,
                      {
                        backgroundColor: colors.card || "#fff",
                        borderColor: isSelected ? colors.info : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <Pressable
                      style={styles.placeContent}
                      onPress={() => {
                        toggleDestination(place);
                        mapRef.current?.animateToCoordinate({
                          latitude: place.lat,
                          longitude: place.lng,
                        });
                      }}
                    >
                      <Image
                        source={{ uri: place.thumbnail }}
                        style={styles.placeThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.placeInfo}>
                        <Text
                          style={[styles.placeName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {place.name}
                        </Text>
                        <View style={styles.placeRow}>
                          <MaterialIcons
                            name="star"
                            size={12}
                            color="#FFA500"
                          />
                          <Text
                            style={[
                              styles.placeRating,
                              { color: secondaryTextColor },
                            ]}
                          >
                            {place.rating} ({place.ratingCount})
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.placeAddress,
                            { color: secondaryTextColor },
                          ]}
                          numberOfLines={1}
                        >
                          {place.address || "Quán ở đâu"}
                        </Text>
                        <Text
                          style={[styles.placeDistance, { color: colors.info }]}
                        >
                          Cách {place.distanceKm} km
                        </Text>
                      </View>

                      {isSelected && order && (
                        <View style={styles.orderBadgeContainer}>
                          <View
                            style={[
                              styles.orderBadge,
                              { backgroundColor: colors.info },
                            ]}
                          >
                            <Text style={styles.orderBadgeText}>{order}</Text>
                          </View>
                        </View>
                      )}
                    </Pressable>

                    {isSelected && (
                      <View style={styles.placeActions}>
                        <Pressable
                          style={[
                            styles.actionButton,
                            { backgroundColor: colors.info },
                          ]}
                          onPress={() => handleSetTime(place.id)}
                        >
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#fff"
                          />
                          <Text style={styles.actionButtonText}>
                            {destination?.visitTime
                              ? formatTime(destination.visitTime)
                              : "Chọn giờ"}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.actionButton,
                            { backgroundColor: colors.success },
                          ]}
                          onPress={() => {}}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#fff"
                          />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Bottom padding for continue button */}
            <View style={{ height: 100 }} />
          </BottomSheetScrollView>
        </BottomSheet>

        {/* Bottom Button */}
        {selectedDestinations.length > 0 && (
          <View style={styles.bottomBarContainer}>
            <View
              style={[
                styles.bottomBar,
                {
                  backgroundColor: colors.background,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.continueButton,
                  { backgroundColor: colors.info },
                ]}
                onPress={async () => {
                  if (selectedDestinations.length === 0) {
                    alert("Vui lòng chọn ít nhất một địa điểm");
                    return;
                  }

                  const destinationsData = selectedDestinations.map((d) => ({
                    id: d.place.id,
                    name: d.place.name,
                    thumbnail: d.place.thumbnail,
                    order: d.order,
                    time: d.visitTime
                      ? d.visitTime.toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : undefined,
                    lat: d.place.lat,
                    lng: d.place.lng,
                  }));

                  try {
                    if (isAddingToExisting && tripId) {
                      // Update existing trip via API with new stops
                      const googlePlaceStops = selectedDestinations.map(
                        (d, index) => ({
                          googlePlaceId: d.place.id, // Google Place ID (string)
                          placeName: d.place.name,
                          address: d.place.address || "",
                          latitude: d.place.lat,
                          longitude: d.place.lng,
                          imageUrl: d.place.thumbnail || "",
                          sequenceOrder: index + 1,
                        }),
                      );

                      await updateItinerary(tripId, {
                        name: tripData?.tripName,
                        startDate: tripData?.startDate,
                        startTime: tripData?.startTime,
                        googlePlaceStops,
                      });

                      // Navigate back to itinerary detail
                      router.back();
                    } else {
                      // Create new trip with Google Place stops
                      const now = new Date();
                      const googlePlaceStops = selectedDestinations.map(
                        (d, index) => ({
                          googlePlaceId: d.place.id, // Google Place ID (string)
                          placeName: d.place.name,
                          address: d.place.address || "",
                          latitude: d.place.lat,
                          longitude: d.place.lng,
                          imageUrl: d.place.thumbnail || "",
                          sequenceOrder: index + 1,
                        }),
                      );

                      const newTrip = await createItinerary({
                        name: tripData?.tripName || "Chuyến đi mới",
                        startDate: tripData?.startDate || now,
                        startTime: tripData?.startTime || now,
                        googlePlaceStops,
                      });

                      // Navigate to success screen with tripId
                      router.replace({
                        pathname: "/(modals)/itinerary-success",
                        params: {
                          tripId: newTrip.id,
                          tripName: newTrip.title,
                          startDate: newTrip.startDate,
                          destinations: JSON.stringify(destinationsData),
                        },
                      });
                    }
                  } catch (error) {
                    console.error("Failed to save trip:", error);
                  }
                }}
              >
                <Text style={styles.continueButtonText}>
                  {isAddingToExisting
                    ? `Cập nhật lịch trình (${selectedDestinations.length}) →`
                    : `Hoàn tất lịch trình (${selectedDestinations.length}) →`}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Discard Confirm Modal */}
        {showDiscardConfirm && (
          <Modal
            visible={showDiscardConfirm}
            transparent
            animationType="none"
            onRequestClose={() => setShowDiscardConfirm(false)}
          >
            <Animated.View
              style={[styles.confirmOverlay, { opacity: confirmOpacity }]}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowDiscardConfirm(false)}
              />
              <View
                style={[
                  styles.confirmCard,
                  {
                    backgroundColor: colors.card || "#fff",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.confirmTitle, { color: colors.text }]}>
                  Bỏ dở chuyến đi?
                </Text>
                <Text
                  style={[styles.confirmBody, { color: secondaryTextColor }]}
                >
                  Các địa điểm bạn đã chọn sẽ bị mất nếu bạn thoát ngay bây giờ.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    onPress={() => setShowDiscardConfirm(false)}
                    style={[
                      styles.confirmButton,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    hitSlop={8}
                  >
                    <Text
                      style={[styles.confirmButtonText, { color: colors.text }]}
                    >
                      Ở lại
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowDiscardConfirm(false);
                      setTimeout(() => {
                        if (onBack) {
                          onBack();
                        } else {
                          router.back();
                        }
                      }, 100);
                    }}
                    style={[styles.confirmButton, styles.confirmButtonDanger]}
                    hitSlop={8}
                  >
                    <Text style={styles.confirmButtonDangerText}>Thoát</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </Modal>
        )}

        {/* Time Picker Modal */}
        {showTimePickerFor && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTimePickerFor(null)}
          >
            <View style={styles.modalOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowTimePickerFor(null)}
              />

              <View
                style={[
                  styles.timePickerCard,
                  { backgroundColor: colors.card || "#fff" },
                ]}
              >
                <View style={styles.timePickerHeader}>
                  <Text
                    style={[styles.timePickerTitle, { color: colors.text }]}
                  >
                    Chọn thời gian xuất phát
                  </Text>
                  <Pressable onPress={() => setShowTimePickerFor(null)}>
                    <Ionicons name="close" size={22} color={colors.icon} />
                  </Pressable>
                </View>

                <View style={styles.timePickerBody}>
                  <Text
                    style={[
                      styles.timePickerLabel,
                      { color: secondaryTextColor },
                    ]}
                  >
                    Địa điểm xuất phát:{" "}
                    {
                      selectedDestinations.find(
                        (d) => d.place.id === showTimePickerFor,
                      )?.place.name
                    }
                  </Text>
                  <Text
                    style={[
                      styles.timePickerHint,
                      { color: secondaryTextColor },
                    ]}
                  >
                    Thời gian xuất phát
                  </Text>

                  {Platform.OS === "ios" ? (
                    <View style={styles.iosTimePickerContainer}>
                      <DateTimePicker
                        value={tempTime}
                        mode="time"
                        display="spinner"
                        onChange={(_, date) => {
                          if (date) setTempTime(date);
                        }}
                        textColor={colors.text}
                      />
                    </View>
                  ) : (
                    <Pressable
                      style={styles.androidTimeDisplay}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Ionicons
                        name="time-outline"
                        size={32}
                        color={colors.info}
                      />
                      <Text
                        style={[styles.androidTimeText, { color: colors.text }]}
                      >
                        {formatTime(tempTime)}
                      </Text>
                      <Text
                        style={{
                          color: colors.info,
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        Nhấn để chọn giờ
                      </Text>
                    </Pressable>
                  )}

                  <Text
                    style={[
                      styles.timePickerFootnote,
                      { color: secondaryTextColor },
                    ]}
                  >
                    Bạn có thể thay đổi sau khi tạo lịch trình
                  </Text>
                  <Text
                    style={[styles.timePickerRecommend, { color: colors.info }]}
                  >
                    Hệ thống gợi ý:{" "}
                    {formatTime(new Date(new Date().setHours(14, 30)))}
                  </Text>
                </View>

                <View style={styles.timePickerActions}>
                  <Pressable
                    style={[
                      styles.timePickerButton,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setShowTimePickerFor(null)}
                  >
                    <Text
                      style={[
                        styles.timePickerButtonText,
                        { color: colors.text },
                      ]}
                    >
                      Hủy
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.timePickerButton,
                      styles.timePickerButtonPrimary,
                      { backgroundColor: colors.info },
                    ]}
                    onPress={handleTimeConfirm}
                  >
                    <Text style={styles.timePickerButtonPrimaryText}>
                      Xác nhận
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {Platform.OS === "android" && showTimePicker && (
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="default"
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (date) {
                    setTempTime(date);
                    // Auto confirm on Android
                    setTimeout(() => handleTimeConfirm(), 100);
                  }
                }}
              />
            )}
          </Modal>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIcon: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSheetContent: {
    paddingBottom: 100,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  selectedCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  listSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  placeCard: {
    borderRadius: 14,
    overflow: "hidden",
  },
  placeContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  placeThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
  },
  placeInfo: {
    flex: 1,
    gap: 4,
  },
  placeName: {
    fontSize: 15,
    fontWeight: "700",
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  placeRating: {
    fontSize: 12,
  },
  placeAddress: {
    fontSize: 12,
  },
  placeDistance: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderBadgeContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBadgeText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  placeActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    justifyContent: "flex-end",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  bottomBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  confirmTitle: { fontSize: 17, fontWeight: "800" },
  confirmBody: { fontSize: 14, lineHeight: 20 },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmButtonDanger: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  confirmButtonText: { fontSize: 14, fontWeight: "700" },
  confirmButtonDangerText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  timePickerCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  timePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  timePickerTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  timePickerBody: {
    padding: 16,
    gap: 12,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  timePickerHint: {
    fontSize: 14,
  },
  iosTimePickerContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  androidTimeDisplay: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  androidTimeText: {
    fontSize: 32,
    fontWeight: "700",
  },
  timePickerFootnote: {
    fontSize: 12,
    textAlign: "center",
  },
  timePickerRecommend: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  timePickerActions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  timePickerButtonPrimary: {
    borderWidth: 0,
  },
  timePickerButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  timePickerButtonPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
