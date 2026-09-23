import Ionicons from "@expo/vector-icons/Ionicons";
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
    ActivityIndicator,
    Animated,
    BackHandler,
    Easing,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationPicker } from "@/features/map/components/LocationPicker";
import { useUserLocation } from "@/features/map/hooks/useUserLocation";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Colors, useColorScheme } from "@/shared";


interface CategoryResponse {
  id: number;
  code: string;
  name: string;
  description: string;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

type Category = string;

type CreateItineraryScreenProps = {
  onBack?: () => void;
};

function getDaysInMonth(year: number, month: number) {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function CreateItineraryScreen({ onBack }: CreateItineraryScreenProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const secondaryTextColor = colors.textSecondary || (colors as any).icon;

  // Location hook
  const {
    location,
    isLoading: locationLoading,
    error: locationError,
    requestPermission,
  } = useUserLocation();
  const [locationAddress, setLocationAddress] =
    useState<string>("Chưa xác định");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  const [tripName, setTripName] = useState("");
  const initialDateRef = useRef(new Date());

  // Initialize time to 18:08 (6:08 PM) once
  const initialTimeRef = useRef<Date>(
    (() => {
      const base = new Date();
      base.setHours(18, 8, 0, 0);
      return base;
    })(),
  );
  const initialCategoriesRef = useRef<Category[]>([]);

  // selected values
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(() => {
    const base = new Date();
    base.setHours(18, 8, 0, 0);
    return base;
  });

  // bottom sheet modal
  const [showDateModal, setShowDateModal] = useState(false);

  // month view is separated from selectedDate so changing month doesn't break selection
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [showTimePicker, setShowTimePicker] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    tripName?: string;
    categories?: string;
  }>({});

  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const confirmOpacity = useRef(new Animated.Value(0)).current;

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await apiClient.get<ApiResponse<CategoryResponse[]>>(
          API_ENDPOINTS.PLACE_TYPES,
        );
        setCategories(response.result);
        setCategoriesError(null);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setCategoriesError("Không thể tải danh mục");
        // Fallback to default categories if API fails
        setCategories([
          { id: 1, code: "coffee", name: "Cà phê", description: "" },
          { id: 2, code: "food", name: "Ăn uống", description: "" },
          { id: 3, code: "shopping", name: "Mua sắm", description: "" },
          { id: 4, code: "sightseeing", name: "Tham quan", description: "" },
          { id: 5, code: "relax", name: "Thư giãn", description: "" },
          { id: 6, code: "park", name: "Công viên", description: "" },
          { id: 7, code: "other", name: "Khác", description: "" },
        ]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    // whenever opening modal, sync month view to selected date
    if (showDateModal) {
      const d = new Date(selectedDate);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      setViewMonth(d);
    }
  }, [showDateModal, selectedDate]);

  // Update location address when location changes
  useEffect(() => {
    if (location) {
      setLocationAddress(
        `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
      );
    }
  }, [location]);

  const days = useMemo(
    () => getDaysInMonth(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth],
  );

  // Monday-first offset
  const firstDayOffset = useMemo(() => {
    const day = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1,
    ).getDay(); // 0-6
    return day === 0 ? 6 : day - 1;
  }, [viewMonth]);

  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [selectedDate]);

  const formattedTime = useMemo(() => {
    const hh = String(selectedTime.getHours()).padStart(2, "0");
    const mm = String(selectedTime.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [selectedTime]);

  const toggleCategory = (c: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const goMonth = (delta: number) => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + delta);
    d.setDate(1);
    setViewMonth(d);
  };

  const setDay = (day: Date) => {
    // keep current time when changing date
    const next = new Date(day);
    next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    setSelectedDate(next);

    // also update selectedTime date part to match
    const t = new Date(selectedTime);
    t.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
    setSelectedTime(t);
  };

  const handleSaveDateTime = () => {
    setShowDateModal(false);
    setShowTimePicker(false);
  };

  const isDirty = useMemo(() => {
    const initialDate = initialDateRef.current;
    const initialTime = initialTimeRef.current;
    const sameDate =
      selectedDate.getFullYear() === initialDate.getFullYear() &&
      selectedDate.getMonth() === initialDate.getMonth() &&
      selectedDate.getDate() === initialDate.getDate();
    const sameTime =
      selectedTime.getHours() === initialTime.getHours() &&
      selectedTime.getMinutes() === initialTime.getMinutes();
    const sameCategories =
      selectedCategories.length === initialCategoriesRef.current.length &&
      selectedCategories.every((c) => initialCategoriesRef.current.includes(c));

    return !(tripName.trim() === "" && sameDate && sameTime && sameCategories);
  }, [selectedCategories, selectedDate, selectedTime, tripName]);

  const requestClose = useCallback(() => {
    if (showDateModal) {
      closeSheet();
      return;
    }
    if (showTimePicker) {
      setShowTimePicker(false);
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
  }, [isDirty, onBack, showDateModal, showTimePicker]);

  const handleBack = () => requestClose();

  const handleRequestLocation = async () => {
    const granted = await requestPermission();
    if (!granted) {
      setLocationAddress("Không có quyền truy cập");
    }
  };

  // ---------- Smooth bottom sheet animation ----------
  const translateY = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    if (!showDateModal) return;
    translateY.setValue(600);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showDateModal, translateY]);

  const closeSheet = () => {
    Animated.timing(translateY, {
      toValue: 600,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowDateModal(false);
    });
  };

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
      if (showDateModal) {
        closeSheet();
        return true;
      }
      if (showTimePicker) {
        setShowTimePicker(false);
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
  }, [requestClose, showDateModal, showDiscardConfirm, showTimePicker]);

  // ---------- UI ----------
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={22} color={colors.icon} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Tạo chuyến đi
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step */}
        <View style={[styles.stepBar, { borderColor: colors.border }]}>
          <Text style={[styles.stepText, { color: colors.text }]}>
            Bước 1/2: Thông tin cơ bản
          </Text>
        </View>

        {/* Trip name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: secondaryTextColor }]}>
            Tên chuyến đi
          </Text>
          <View
            style={[
              styles.inputShell,
              {
                backgroundColor: colors.card ?? "#fff",
                borderColor: errors.tripName ? "#FF3B30" : colors.border,
              },
            ]}
          >
            <TextInput
              value={tripName}
              onChangeText={(text) => {
                setTripName(text);
                if (errors.tripName) {
                  setErrors({ ...errors, tripName: undefined });
                }
              }}
              placeholder="Ví dụ: Đi cà phê cuối tuần ở Làng ĐH"
              style={[styles.input, { color: colors.text }]}
              placeholderTextColor={secondaryTextColor}
            />
          </View>
          {errors.tripName && (
            <Text style={[styles.errorText, { color: "#FF3B30" }]}>
              {errors.tripName}
            </Text>
          )}
        </View>

        {/* Date time */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: secondaryTextColor }]}>
            Khi nào bạn muốn đi?
          </Text>

          <View
            style={[
              styles.card,
              {
                borderColor: colors.border,
                backgroundColor: colors.card ?? "#fff",
              },
            ]}
          >
            <Pressable
              style={styles.row}
              onPress={() => setShowDateModal(true)}
            >
              <View style={styles.rowLeft}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.info}
                />
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Ngày đi
                </Text>
              </View>
              <Text style={[styles.rowValue, { color: secondaryTextColor }]}>
                {formattedDate}
              </Text>
            </Pressable>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <Pressable
              style={styles.row}
              onPress={() => setShowDateModal(true)}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="time-outline" size={20} color={colors.info} />
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Giờ xuất phát
                </Text>
              </View>
              <Text style={[styles.rowValue, { color: secondaryTextColor }]}>
                {formattedTime}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: secondaryTextColor }]}>
            Đi từ đâu?
          </Text>

          <Pressable
            style={[
              styles.locationButton,
              {
                borderColor: colors.info,
                backgroundColor: `${colors.info}14`,
              },
            ]}
            onPress={() => {
              // If no location yet, request permission first
              if (!location && !selectedLocation) {
                handleRequestLocation();
              } else {
                // If we have location, open picker to let user choose
                setShowLocationPicker(true);
              }
            }}
          >
            <Ionicons
              name={
                locationLoading
                  ? "hourglass-outline"
                  : location || selectedLocation
                    ? "location"
                    : "location-outline"
              }
              size={18}
              color={colors.info}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                {selectedLocation
                  ? "Điểm xuất phát"
                  : location
                    ? "Vị trí hiện tại"
                    : "Cho phép truy cập vị trí"}
              </Text>
              <Text
                style={[styles.rowValue, { color: secondaryTextColor }]}
                numberOfLines={1}
              >
                {selectedLocation
                  ? selectedLocation.address
                  : locationLoading
                    ? "Đang lấy vị trí..."
                    : locationError
                      ? "Không thể lấy vị trí"
                      : locationAddress}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.icon} />
          </Pressable>

          {(location || selectedLocation) && (
            <Pressable
              style={styles.linkRow}
              onPress={() => setShowLocationPicker(true)}
            >
              <Ionicons name="map-outline" size={16} color={colors.info} />
              <Text style={[styles.linkText, { color: colors.info }]}>
                Chọn điểm xuất phát khác
              </Text>
            </Pressable>
          )}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: secondaryTextColor }]}>
            Bạn muốn chuyến đi kiểu gì ?
          </Text>

          {categoriesLoading ? (
            <View
              style={[
                styles.chipRow,
                { justifyContent: "center", paddingVertical: 20 },
              ]}
            >
              <ActivityIndicator size="small" color={colors.info} />
              <Text
                style={[
                  styles.chipText,
                  { color: secondaryTextColor, marginLeft: 8 },
                ]}
              >
                Đang tải danh mục...
              </Text>
            </View>
          ) : categoriesError ? (
            <View
              style={[
                styles.chipRow,
                { justifyContent: "center", paddingVertical: 20 },
              ]}
            >
              <Text style={[styles.chipText, { color: "#FF3B30" }]}>
                {categoriesError}
              </Text>
            </View>
          ) : (
            <View style={styles.chipRow}>
              {categories.map((cat) => {
                const active = selectedCategories.includes(cat.code);
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => toggleCategory(cat.code)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? `${colors.info}14`
                          : colors.muted,
                        borderColor: active ? colors.info : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.info : colors.text },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {errors.categories && (
            <Text
              style={[styles.errorText, { color: "#FF3B30", marginTop: 8 }]}
            >
              {errors.categories}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.info }]}
            onPress={() => {
              // Validate
              const newErrors: { tripName?: string; categories?: string } = {};

              if (!tripName.trim()) {
                newErrors.tripName = "Vui lòng nhập tên chuyến đi";
              }

              if (selectedCategories.length === 0) {
                newErrors.categories = "Vui lòng chọn ít nhất một sở thích";
              }

              if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                return;
              }

              // Clear errors and navigate
              setErrors({});
              router.push({
                pathname: "/(modals)/select-destinations",
                params: {
                  tripName,
                  startDate: selectedDate.toISOString(),
                  startTime: selectedTime.toISOString(),
                  categories: selectedCategories.join(","),
                },
              });
            }}
          >
            <Text style={styles.primaryButtonText}>Tiếp tục chọn điểm đến</Text>
          </Pressable>

          {/* <Pressable style={styles.secondaryLink}>
            <Text style={[styles.linkText, { color: colors.info }]}>
              Hoặc để AI gợi ý lịch trình từ thông tin này
            </Text>
          </Pressable> */}
        </View>
      </ScrollView>

      {/* -------- Bottom Sheet Modal (smooth) -------- */}
      <Modal
        visible={showDateModal}
        animationType="none"
        transparent
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.modalOverlay} onPress={closeSheet} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Pressable onPress={closeSheet} style={styles.headerIcon}>
              <Ionicons name="close" size={22} color={colors.icon} />
            </Pressable>

            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Chọn ngày & giờ
            </Text>

            <Pressable onPress={handleSaveDateTime} hitSlop={10}>
              <Text style={[styles.skipText, { color: colors.info }]}>
                Xong
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sheetHint, { color: secondaryTextColor }]}>
            Bạn có thể chỉnh sau nếu đổi kế hoạch
          </Text>

          {/* Calendar */}
          <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => goMonth(-1)} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={18} color={colors.icon} />
              </Pressable>

              <Text style={[styles.calendarMonth, { color: colors.text }]}>
                Tháng {viewMonth.getMonth() + 1}, {viewMonth.getFullYear()}
              </Text>

              <Pressable onPress={() => goMonth(1)} style={styles.iconBtn}>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.icon}
                />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <Text
                  key={d}
                  style={[styles.weekLabel, { color: secondaryTextColor }]}
                >
                  {d}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {Array.from({ length: firstDayOffset }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.dayCell} />
              ))}

              {days.map((day) => {
                const isActive = sameDay(day, selectedDate);
                const isToday = sameDay(day, new Date());
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <Pressable
                    key={day.toISOString()}
                    onPress={() => !isPast && setDay(day)}
                    disabled={isPast}
                    style={[
                      styles.dayCell,
                      isActive && {
                        backgroundColor: `${colors.info}18`,
                        borderRadius: 9999,
                      },
                      isPast && {
                        opacity: 0.3,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        {
                          color: isPast
                            ? colors.textSecondary
                            : isActive
                              ? colors.info
                              : colors.text,
                          fontWeight: isActive ? "800" : "600",
                        },
                      ]}
                    >
                      {day.getDate()}
                    </Text>

                    {isToday && !isActive ? (
                      <View
                        style={[
                          styles.todayDot,
                          { backgroundColor: colors.info },
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <View
              style={[
                styles.selectedDatePill,
                { backgroundColor: colors.muted },
              ]}
            >
              <Text style={{ color: colors.text }}>
                Đã chọn: {selectedDate.toLocaleDateString("vi-VN")} •{" "}
                {formattedTime}
              </Text>
            </View>
          </View>

          {/* Time picker */}
          <View style={styles.timeSection}>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={[
                styles.timeCard,
                {
                  backgroundColor: colors.card ?? "#fff",
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Ionicons name="time-outline" size={18} color={colors.info} />
                <Text style={[styles.timeLabel, { color: colors.text }]}>
                  Giờ xuất phát
                </Text>
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={[styles.timeValue, { color: colors.text }]}>
                  {formattedTime}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.icon} />
              </View>
            </Pressable>

            {/* iOS: show spinner inline for smoothness */}
            {Platform.OS === "ios" && showTimePicker && (
              <View
                style={[
                  styles.iosPickerWrap,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF",
                    borderColor: colors.border,
                  },
                ]}
              >
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="spinner"
                  themeVariant={colorScheme}
                  onChange={(_, date) => {
                    if (!date) return;
                    const d = new Date(date);
                    d.setFullYear(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate(),
                    );
                    setSelectedTime(d);
                  }}
                />
                <Pressable
                  onPress={() => setShowTimePicker(false)}
                  style={[
                    styles.pickerDoneBtn,
                    { backgroundColor: colors.info },
                  ]}
                >
                  <Text style={styles.pickerDoneText}>Xong</Text>
                </Pressable>
              </View>
            )}

            {/* Android: open native dialog */}
            {Platform.OS === "android" && showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (!date) return;
                  const d = new Date(date);
                  d.setFullYear(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    selectedDate.getDate(),
                  );
                  setSelectedTime(d);
                }}
              />
            )}
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.info,
                marginHorizontal: 16,
                marginBottom: 16,
              },
            ]}
            onPress={handleSaveDateTime}
          >
            <Text style={styles.primaryButtonText}>Lưu</Text>
          </Pressable>
        </Animated.View>
      </Modal>

      {/* Discard confirmation */}
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
                  backgroundColor: colors.card ?? "#fff",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.confirmTitle, { color: colors.text }]}>
                Bỏ dở chuyến đi?
              </Text>
              <Text style={[styles.confirmBody, { color: secondaryTextColor }]}>
                Mọi thông tin bạn đã chọn sẽ bị mất nếu bạn thoát ngay bây giờ.
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

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <Modal
          visible={showLocationPicker}
          animationType="slide"
          onRequestClose={() => setShowLocationPicker(false)}
        >
          <LocationPicker
            initialLocation={
              selectedLocation
                ? {
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }
                : location
                  ? {
                      latitude: location.latitude,
                      longitude: location.longitude,
                    }
                  : undefined
            }
            onLocationSelect={(loc) => {
              setSelectedLocation(loc);
              setShowLocationPicker(false);
            }}
            onCancel={() => setShowLocationPicker(false)}
            colorScheme={colorScheme}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIcon: { padding: 6 },

  headerTitle: { fontSize: 18, fontWeight: "800" },
  skipText: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },

  stepBar: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepText: { fontSize: 14, fontWeight: "700" },

  section: { gap: 8 },

  label: { fontSize: 14, fontWeight: "700" },

  inputShell: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    fontSize: 14,
    paddingVertical: 6,
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowTitle: { fontSize: 14, fontWeight: "700" },
  rowValue: { fontSize: 13 },

  divider: { height: StyleSheet.hairlineWidth },

  locationButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  linkRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkText: { fontSize: 14, fontWeight: "700" },

  errorText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  continueButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { fontSize: 13, fontWeight: "700" },

  primaryButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  secondaryLink: { marginTop: 8, alignItems: "center" },

  // ---------- Sheet ----------
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    maxHeight: "96%",
    minHeight: "80%",
    // shadow
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
    marginBottom: 10,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },

  sheetTitle: { fontSize: 16, fontWeight: "800" },
  sheetHint: { fontSize: 13, paddingHorizontal: 16, marginBottom: 10 },

  calendar: { paddingHorizontal: 16, paddingBottom: 6 },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarMonth: { fontSize: 16, fontWeight: "800" },

  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  weekLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },

  daysGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  dayCell: {
    width: `${100 / 7}%`,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: { fontSize: 14 },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    marginTop: 3,
  },

  selectedDatePill: {
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },

  timeSection: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 10,
  },

  timeCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  timeLabel: { fontSize: 14, fontWeight: "800" },
  timeValue: { fontSize: 16, fontWeight: "900" },

  iosPickerWrap: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
  },
  pickerDoneBtn: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  pickerDoneText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
