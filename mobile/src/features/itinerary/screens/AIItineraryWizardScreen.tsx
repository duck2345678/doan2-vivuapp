/**
 * AI Itinerary Wizard Screen
 *
 * CURRENT STATUS: Using MOCK AI RESPONSES
 *
 * TO ENABLE REAL GEMINI AI:
 * 1. Get API key from: https://ai.google.dev/
 * 2. Add to .env: EXPO_PUBLIC_GEMINI_API_KEY=your_key
 * 3. Uncomment real API calls in: src/lib/ai/geminiService.ts
 * 4. See full guide: docs/GEMINI_SETUP.md
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
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

import {
  AIItineraryMap,
  AIItineraryMapRef,
} from "@/features/itinerary/components/AIItineraryMap";
import { useUserLocation } from "@/features/map/hooks";
import { generateItinerary, type Destination } from "@/lib/ai/geminiService";
import { Colors, useColorScheme } from "@/shared";

const { width } = Dimensions.get("window");

type ActivityType = "deadline" | "food-tour" | "date-chill" | "hangout";
type TransportType = "walking-bus" | "motorbike";
type BudgetType = "low" | "high";
type TimeSlotType = "morning" | "afternoon" | "evening" | "fullday";
type GroupSizeType = "solo" | "couple" | "small-group" | "large-group";
type SpecialPreferenceType =
  | "pet-friendly"
  | "photo-spots"
  | "wifi-available"
  | "outdoor";

interface WizardData {
  activity?: ActivityType;
  transport?: TransportType;
  budget?: BudgetType;
  timeSlot?: TimeSlotType;
  groupSize?: GroupSizeType;
  specialPreferences?: SpecialPreferenceType[];
}

const ACTIVITIES = [
  {
    id: "deadline" as ActivityType,
    icon: "🍱",
    title: "Chạy Deadline",
    subtitle: "Cafe yên tĩnh, wifi mạnh, có ổ cắm",
  },
  {
    id: "food-tour" as ActivityType,
    icon: "😋",
    title: "Food Tour",
    subtitle: "Chọ đêm, quán ăn vặt, lẩu nướng",
  },
  {
    id: "date-chill" as ActivityType,
    icon: "💖",
    title: "Hẹn hò / Chill",
    subtitle: "Hồ Đá, cafe view đẹp, riêng tư",
  },
  {
    id: "hangout" as ActivityType,
    icon: "🎮",
    title: "Tụ tập bạn bè",
    subtitle: "Boardgame, quán nhậu, karaoke",
  },
];

const TRANSPORTS = [
  {
    id: "walking-bus" as TransportType,
    icon: "🚶",
    title: "Đi bộ / Xe buýt",
    subtitle: "Gợi ý địa điểm gần nhau",
  },
  {
    id: "motorbike" as TransportType,
    icon: "🏍️",
    title: "Xe máy",
    subtitle: "Có thể đi xa hơn",
  },
];

const BUDGETS = [
  {
    id: "low" as BudgetType,
    icon: "💰",
    title: "Cuối tháng rồi...",
    subtitle: "Camteen, cơm 25k, trà đá",
  },
  {
    id: "high" as BudgetType,
    icon: "💎",
    title: "Đầu tháng / Có lương",
    subtitle: "Quán mấy lành, thượng hảo",
  },
];

const TIME_SLOTS = [
  {
    id: "morning" as TimeSlotType,
    icon: "🌅",
    title: "Buổi sáng",
    subtitle: "7:00 - 11:00",
  },
  {
    id: "afternoon" as TimeSlotType,
    icon: "☀️",
    title: "Buổi chiều",
    subtitle: "13:00 - 17:00",
  },
  {
    id: "evening" as TimeSlotType,
    icon: "🌙",
    title: "Buổi tối",
    subtitle: "18:00 - 22:00",
  },
  {
    id: "fullday" as TimeSlotType,
    icon: "📅",
    title: "Cả ngày",
    subtitle: "Từ sáng đến tối",
  },
];

const GROUP_SIZES = [
  {
    id: "solo" as GroupSizeType,
    icon: "🧍",
    title: "Một mình",
    subtitle: "Me time, tự do khám phá",
  },
  {
    id: "couple" as GroupSizeType,
    icon: "💑",
    title: "Hai người",
    subtitle: "Hẹn hò, chill cùng bạn",
  },
  {
    id: "small-group" as GroupSizeType,
    icon: "👨‍👩‍👧",
    title: "3-5 người",
    subtitle: "Nhóm nhỏ, dễ di chuyển",
  },
  {
    id: "large-group" as GroupSizeType,
    icon: "👥",
    title: "6+ người",
    subtitle: "Đông vui, cần chỗ rộng",
  },
];

const SPECIAL_PREFERENCES = [
  {
    id: "pet-friendly" as SpecialPreferenceType,
    icon: "🐕",
    title: "Pet-friendly",
  },
  {
    id: "photo-spots" as SpecialPreferenceType,
    icon: "📸",
    title: "Có view đẹp",
  },
  {
    id: "wifi-available" as SpecialPreferenceType,
    icon: "📶",
    title: "Có WiFi",
  },
  {
    id: "outdoor" as SpecialPreferenceType,
    icon: "🌳",
    title: "Ngoài trời",
  },
];

export function AIItineraryWizardScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItinerary, setGeneratedItinerary] = useState<any>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const loadingDots = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<AIItineraryMapRef>(null);

  // Get user location for map
  const { location: userLocation } = useUserLocation();

  useEffect(() => {
    // Slide in animation when step changes
    slideAnim.setValue(300);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    if (isGenerating) {
      // Animate loading dots
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingDots, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(loadingDots, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isGenerating]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && !isGenerating && !generatedItinerary) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const startTime = Date.now();

    try {
      // This will use mock data now, but will use real Gemini AI when you add API key
      const itinerary = await generateItinerary({
        activity: wizardData.activity!,
        transport: wizardData.transport!,
        budget: wizardData.budget!,
        timeSlot: wizardData.timeSlot,
        groupSize: wizardData.groupSize,
      });

      // Ensure loading screen shows for at least 3 seconds
      const elapsed = Date.now() - startTime;
      const minLoadingTime = 3000;
      if (elapsed < minLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minLoadingTime - elapsed),
        );
      }

      setGeneratedItinerary(itinerary);
    } catch (error) {
      console.error("Failed to generate itinerary:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveItinerary = async () => {
    if (!generatedItinerary) return;

    try {
      const now = new Date();
      const tripId = Date.now().toString();

      // AI-generated itinerary: navigate to select destinations for actual places
      // Since AI places don't have database IDs, we navigate to itinerary detail
      // where user can see the suggested places and add real places from the map
      const destinationsData = generatedItinerary.destinations.map(
        (dest: Destination, index: number) => ({
          id: `ai-${index}`,
          name: dest.name,
          thumbnail: "",
          order: index + 1,
          time: dest.time,
          lat: dest.place.lat,
          lng: dest.place.lng,
          address: dest.place.address,
        }),
      );

      // Navigate to itinerary detail with AI-generated data
      router.replace({
        pathname: "/(modals)/itinerary-detail" as any,
        params: {
          tripId,
          tripName: generatedItinerary.title,
          startDate: now.toISOString(),
          startTime: now.toISOString(),
          destinations: JSON.stringify(destinationsData),
          isAiGenerated: "true", // Flag to indicate this needs to be saved
        },
      });
    } catch (error) {
      console.error("Failed to save itinerary:", error);
    }
  };

  const canContinue = () => {
    if (currentStep === 1) return !!wizardData.activity;
    if (currentStep === 2) return !!wizardData.transport;
    if (currentStep === 3) return !!wizardData.budget;
    if (currentStep === 4) return !!wizardData.timeSlot;
    if (currentStep === 5) return !!wizardData.groupSize;
    return false;
  };

  const getActivityLabel = (id: ActivityType) => {
    return ACTIVITIES.find((a) => a.id === id)?.title || "";
  };

  const getTransportLabel = (id: TransportType) => {
    return TRANSPORTS.find((t) => t.id === id)?.title || "";
  };

  const getBudgetLabel = (id: BudgetType) => {
    return BUDGETS.find((b) => b.id === id)?.title || "";
  };

  const getTimeSlotLabel = (id: TimeSlotType) => {
    return TIME_SLOTS.find((t) => t.id === id)?.title || "";
  };

  const getGroupSizeLabel = (id: GroupSizeType) => {
    return GROUP_SIZES.find((g) => g.id === id)?.title || "";
  };

  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              {
                backgroundColor: currentStep >= step ? "#3b82f6" : "#E5E7EB",
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderStep1 = () => (
    <Animated.View
      style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Bạn đang muốn làm gì?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Chọn tâm trạng của bạn hôm nay
      </Text>

      <View style={styles.optionsContainer}>
        {ACTIVITIES.map((activity) => (
          <Pressable
            key={activity.id}
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.card,
                borderColor:
                  wizardData.activity === activity.id
                    ? colors.info
                    : colors.border,
                borderWidth: wizardData.activity === activity.id ? 2 : 1,
              },
            ]}
            onPress={() =>
              setWizardData({ ...wizardData, activity: activity.id })
            }
          >
            <Text style={styles.optionIcon}>{activity.icon}</Text>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {activity.title}
              </Text>
              <Text
                style={[styles.optionSubtitle, { color: colors.textSecondary }]}
              >
                {activity.subtitle}
              </Text>
            </View>
            {wizardData.activity === activity.id && (
              <Ionicons name="checkmark-circle" size={24} color={colors.info} />
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View
      style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Phương tiện di chuyển?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Giúp AI gợi ý khoảng cách phù hợp
      </Text>

      <View style={styles.optionsContainer}>
        {TRANSPORTS.map((transport) => (
          <Pressable
            key={transport.id}
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.card,
                borderColor:
                  wizardData.transport === transport.id
                    ? colors.info
                    : colors.border,
                borderWidth: wizardData.transport === transport.id ? 2 : 1,
              },
            ]}
            onPress={() =>
              setWizardData({ ...wizardData, transport: transport.id })
            }
          >
            <Text style={styles.optionIcon}>{transport.icon}</Text>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {transport.title}
              </Text>
              <Text
                style={[styles.optionSubtitle, { color: colors.textSecondary }]}
              >
                {transport.subtitle}
              </Text>
            </View>
            {wizardData.transport === transport.id && (
              <Ionicons name="checkmark-circle" size={24} color={colors.info} />
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View
      style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Tình trạng ví tiền?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Để AI gợi ý phù hợp túi tiền
      </Text>

      <View style={styles.optionsContainer}>
        {BUDGETS.map((budget) => (
          <Pressable
            key={budget.id}
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.card,
                borderColor:
                  wizardData.budget === budget.id ? colors.info : colors.border,
                borderWidth: wizardData.budget === budget.id ? 2 : 1,
              },
            ]}
            onPress={() => setWizardData({ ...wizardData, budget: budget.id })}
          >
            <Text style={styles.optionIcon}>{budget.icon}</Text>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {budget.title}
              </Text>
              <Text
                style={[styles.optionSubtitle, { color: colors.textSecondary }]}
              >
                {budget.subtitle}
              </Text>
            </View>
            {wizardData.budget === budget.id && (
              <Ionicons name="checkmark-circle" size={24} color={colors.info} />
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View
      style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Bạn muốn đi lúc nào?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Chọn khung giờ phù hợp
      </Text>

      <View style={styles.optionsContainer}>
        {TIME_SLOTS.map((timeSlot) => (
          <Pressable
            key={timeSlot.id}
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.card,
                borderColor:
                  wizardData.timeSlot === timeSlot.id
                    ? colors.info
                    : colors.border,
                borderWidth: wizardData.timeSlot === timeSlot.id ? 2 : 1,
              },
            ]}
            onPress={() =>
              setWizardData({ ...wizardData, timeSlot: timeSlot.id })
            }
          >
            <Text style={styles.optionIcon}>{timeSlot.icon}</Text>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {timeSlot.title}
              </Text>
              <Text
                style={[styles.optionSubtitle, { color: colors.textSecondary }]}
              >
                {timeSlot.subtitle}
              </Text>
            </View>
            {wizardData.timeSlot === timeSlot.id && (
              <Ionicons name="checkmark-circle" size={24} color={colors.info} />
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep5 = () => (
    <Animated.View
      style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Đi bao nhiêu người?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Giúp AI gợi ý địa điểm phù hợp
      </Text>

      <View style={styles.optionsContainer}>
        {GROUP_SIZES.map((groupSize) => (
          <Pressable
            key={groupSize.id}
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.card,
                borderColor:
                  wizardData.groupSize === groupSize.id
                    ? colors.info
                    : colors.border,
                borderWidth: wizardData.groupSize === groupSize.id ? 2 : 1,
              },
            ]}
            onPress={() =>
              setWizardData({ ...wizardData, groupSize: groupSize.id })
            }
          >
            <Text style={styles.optionIcon}>{groupSize.icon}</Text>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {groupSize.title}
              </Text>
              <Text
                style={[styles.optionSubtitle, { color: colors.textSecondary }]}
              >
                {groupSize.subtitle}
              </Text>
            </View>
            {wizardData.groupSize === groupSize.id && (
              <Ionicons name="checkmark-circle" size={24} color={colors.info} />
            )}
          </Pressable>
        ))}
      </View>

      {/* Special Preferences - Optional Toggles */}
      <Text
        style={[
          styles.stepSubtitle,
          { color: colors.textSecondary, marginTop: 16, marginBottom: 8 },
        ]}
      >
        Ưu tiên (không bắt buộc)
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {SPECIAL_PREFERENCES.map((pref) => {
          const isSelected = wizardData.specialPreferences?.includes(pref.id);
          return (
            <Pressable
              key={pref.id}
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: isSelected ? "#DBEAFE" : colors.card,
                  borderColor: isSelected ? "#3B82F6" : colors.border,
                },
              ]}
              onPress={() => {
                const currentPrefs = wizardData.specialPreferences || [];
                const newPrefs = isSelected
                  ? currentPrefs.filter((p) => p !== pref.id)
                  : [...currentPrefs, pref.id];
                setWizardData({ ...wizardData, specialPreferences: newPrefs });
              }}
            >
              <Text style={{ fontSize: 16, marginRight: 4 }}>{pref.icon}</Text>
              <Text
                style={{
                  color: isSelected ? "#3B82F6" : colors.text,
                  fontSize: 13,
                }}
              >
                {pref.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: "#F3E8FF", borderColor: "#E9D5FF" },
        ]}
      >
        <Text style={[styles.summaryTitle, { color: "#7C3AED" }]}>
          📋 Tóm tắt:
        </Text>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          Mục đích: {getActivityLabel(wizardData.activity!)}
        </Text>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          Di chuyển: {getTransportLabel(wizardData.transport!)}
        </Text>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          Ngân sách: {getBudgetLabel(wizardData.budget!)}
        </Text>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          Khung giờ: {getTimeSlotLabel(wizardData.timeSlot!)}
        </Text>
        {wizardData.groupSize && (
          <Text style={[styles.summaryText, { color: colors.text }]}>
            Số người: {getGroupSizeLabel(wizardData.groupSize)}
          </Text>
        )}
      </View>
    </Animated.View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <View style={styles.aiIconContainer}>
          <Animated.View
            style={[
              styles.aiIconPulse,
              {
                transform: [
                  {
                    scale: loadingDots.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="sparkles" size={48} color="#FFFFFF" />
          </Animated.View>
        </View>

        <Text style={[styles.loadingTitle, { color: colors.text }]}>
          AI đang nghĩ cho bạn...
        </Text>
        <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
          Đang phân tích yêu cầu và tạo lịch trình phù hợp nhất
        </Text>

        <View style={styles.loadingDots}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.loadingDot,
                { backgroundColor: colors.info },
                {
                  opacity: loadingDots.interpolate({
                    inputRange: [0, 1],
                    outputRange:
                      i === 0 ? [0.3, 1] : i === 1 ? [0.3, 0.6] : [0.3, 0.3],
                  }),
                },
              ]}
            />
          ))}
        </View>

        <Text style={[styles.loadingHint, { color: colors.textSecondary }]}>
          Nhanh thôi mà, chờ xíu xíu nha!
        </Text>
        <Text style={[styles.loadingHint, { color: colors.textSecondary }]}>
          (Thường mất khoảng 10-20 giây)
        </Text>
      </View>
    </View>
  );

  const renderResult = () => {
    if (!generatedItinerary) return null;

    return (
      <ScrollView
        style={styles.resultContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.resultTitle, { color: colors.text }]}>
          Lộ trình của bạn
        </Text>
        <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
          {generatedItinerary.title}
        </Text>

        {/* Map Preview */}
        <Pressable
          style={styles.mapPreview}
          onPress={() => setShowMapModal(true)}
          onLongPress={() => setShowMapModal(true)}
        >
          <AIItineraryMap
            destinations={generatedItinerary.destinations}
            colorScheme={colorScheme}
            userLocation={userLocation}
          />
          <View style={styles.mapOverlay}>
            <View
              style={[styles.mapHint, { backgroundColor: "rgba(0,0,0,0.75)" }]}
            >
              <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
              <Text style={styles.mapHintText}>Nhấn để xem toàn màn hình</Text>
            </View>
          </View>
        </Pressable>

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          {generatedItinerary.destinations.map((dest: any, index: number) => (
            <View key={dest.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View
                  style={[styles.timelineDot, { backgroundColor: colors.info }]}
                />
                {index < generatedItinerary.destinations.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </View>

              <View
                style={[
                  styles.timelineCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.timelineHeader}>
                  <View
                    style={[styles.timeChip, { backgroundColor: "#E3F2FD" }]}
                  >
                    <Ionicons name="time-outline" size={14} color="#2196F3" />
                    <Text style={[styles.timeChipText, { color: "#2196F3" }]}>
                      {dest.time}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.durationText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {dest.duration || "~30 phút"}
                  </Text>
                </View>

                <Text style={[styles.destinationName, { color: colors.text }]}>
                  {dest.name}
                </Text>
                <Text
                  style={[
                    styles.destinationDesc,
                    { color: colors.textSecondary },
                  ]}
                >
                  {dest.description}
                </Text>

                <View style={styles.chipRow}>
                  <View style={[styles.chip, { backgroundColor: "#E8F5E9" }]}>
                    <Text style={[styles.chipText, { color: "#4CAF50" }]}>
                      {dest.category}
                    </Text>
                  </View>
                  {dest.budget && (
                    <View style={[styles.chip, { backgroundColor: "#FFF3E0" }]}>
                      <Text style={[styles.chipText, { color: "#FF9800" }]}>
                        {dest.budget}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  if (isGenerating) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        {renderLoading()}
      </SafeAreaView>
    );
  }

  if (generatedItinerary) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.icon} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Gợi ý lịch trình
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {renderResult()}

        {/* Action Buttons */}
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
              styles.halfButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderWidth: 1.5,
              },
            ]}
            onPress={() => {
              setGeneratedItinerary(null);
              setCurrentStep(1);
              setWizardData({});
            }}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.text} />
            <Text style={[styles.halfButtonText, { color: colors.text }]}>
              Tạo lại
            </Text>
          </Pressable>
          <Pressable
            style={[styles.halfButton, { backgroundColor: colors.info }]}
            onPress={handleSaveItinerary}
          >
            <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.halfButtonText, { color: "#FFFFFF" }]}>
              Bắt đầu đi
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Gợi ý nhanh
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {renderProgressBar()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          style={[
            styles.continueButton,
            {
              backgroundColor: canContinue() ? colors.info : colors.border,
              opacity: canContinue() ? 1 : 0.5,
            },
          ]}
          onPress={handleNext}
          disabled={!canContinue()}
        >
          <Text style={[styles.continueButtonText, { color: "#FFFFFF" }]}>
            {currentStep === 5 ? "Gợi ý cho tôi ngay!" : "Tiếp tục"} →
          </Text>
        </Pressable>
      </View>

      {/* Fullscreen Map Modal */}
      {generatedItinerary && (
        <Modal
          visible={showMapModal}
          animationType="slide"
          onRequestClose={() => setShowMapModal(false)}
        >
          <SafeAreaView style={styles.modalContainer} edges={["top"]}>
            <View
              style={[
                styles.modalHeader,
                {
                  backgroundColor: colors.background,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => setShowMapModal(false)}
                style={styles.backButton}
              >
                <Ionicons name="close" size={24} color={colors.icon} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Bản đồ lộ trình
              </Text>
              <Pressable
                onPress={() => {
                  mapRef.current?.fitToCoordinates();
                }}
                style={styles.backButton}
              >
                <Ionicons name="locate" size={24} color={colors.info} />
              </Pressable>
            </View>

            <View style={styles.fullscreenMap}>
              <AIItineraryMap
                ref={mapRef}
                destinations={generatedItinerary.destinations}
                colorScheme={colorScheme}
                userLocation={userLocation}
              />
            </View>

            {/* Destination List Overlay */}
            <View
              style={[
                styles.destinationOverlay,
                { backgroundColor: colors.background },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.destinationScrollContent}
              >
                {generatedItinerary.destinations.map(
                  (dest: any, index: number) => (
                    <Pressable
                      key={dest.id}
                      style={[
                        styles.miniDestCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (dest.lat && dest.lng) {
                          mapRef.current?.animateToCoordinate({
                            latitude: dest.lat,
                            longitude: dest.lng,
                          });
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.miniNumber,
                          { backgroundColor: colors.error },
                        ]}
                      >
                        <Text style={styles.miniNumberText}>{dest.order}</Text>
                      </View>
                      <View style={styles.miniDestInfo}>
                        <Text
                          style={[styles.miniDestName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {dest.name}
                        </Text>
                        <Text
                          style={[
                            styles.miniDestTime,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {dest.time}
                        </Text>
                      </View>
                    </Pressable>
                  ),
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: "center",
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 16,
    backgroundColor: "#FFFFFF",
  },
  optionIcon: {
    fontSize: 48,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryCard: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  continueButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingContent: {
    alignItems: "center",
  },
  aiIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#7C4DFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  aiIconPulse: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  loadingDots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingHint: {
    fontSize: 13,
    marginBottom: 4,
  },
  resultContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 15,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  mapPreview: {
    marginHorizontal: 20,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 12,
    pointerEvents: "none",
  },
  mapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mapHintText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  mapPreviewText: {
    marginTop: 8,
    fontSize: 14,
  },
  timelineContainer: {
    paddingHorizontal: 20,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: 12,
    width: 24,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  durationText: {
    fontSize: 12,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  destinationDesc: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  resultActions: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 20,
  },
  resultActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resultActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  halfButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  halfButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fullscreenMap: {
    flex: 1,
  },
  destinationOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  destinationScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  miniDestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 160,
  },
  miniNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  miniNumberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  miniDestInfo: {
    flex: 1,
  },
  miniDestName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  miniDestTime: {
    fontSize: 11,
  },
});
