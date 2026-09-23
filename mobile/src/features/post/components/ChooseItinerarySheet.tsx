/**
 * ChooseItinerarySheet Component
 * Bottom sheet for selecting an Itinerary when creating a post
 */

import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetFlatList,
    BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ItineraryForSelection } from "../types/createPost.types";

type StatusFilter = "all" | "upcoming" | "ongoing" | "completed";

interface StatusFilterOption {
  key: StatusFilter;
  label: string;
  color: string;
  bgColor: string;
}

const STATUS_FILTERS: StatusFilterOption[] = [
  { key: "all", label: "Tất cả", color: "#3b82f6", bgColor: "#DBEAFE" },
  { key: "upcoming", label: "Sắp tới", color: "#2563EB", bgColor: "#DBEAFE" },
  { key: "ongoing", label: "Đang đi", color: "#16A34A", bgColor: "#DCFCE7" },
  { key: "completed", label: "Đã đi", color: "#6B7280", bgColor: "#F3F4F6" },
];

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "ongoing":
      return { bg: "#DCFCE7", text: "#16A34A", label: "Đang đi" };
    case "completed":
      return { bg: "#F3F4F6", text: "#6B7280", label: "Đã đi" };
    case "upcoming":
    default:
      return { bg: "#DBEAFE", text: "#2563EB", label: "Sắp tới" };
  }
};

export interface ChooseItinerarySheetProps {
  onSelect: (itinerary: ItineraryForSelection) => void;
}

interface ItineraryWithStatus extends ItineraryForSelection {
  status: string;
}

export const ChooseItinerarySheet = forwardRef<
  BottomSheet,
  ChooseItinerarySheetProps
>(({ onSelect }, ref) => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [allItineraries, setAllItineraries] = useState<ItineraryWithStatus[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load trips from API
  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    console.log('[ChooseItinerarySheet] Loading trips from API...');
    try {
      // Import fetchItineraries from itinerary service
      const { fetchItineraries } = await import('@/features/itinerary/services/itineraryService');
      
      // Fetch all itineraries from API
      const itineraries = await fetchItineraries();
      console.log('[ChooseItinerarySheet] Fetched itineraries:', itineraries.length, itineraries);
      
      const mappedItineraries: ItineraryWithStatus[] = itineraries.map(
        (itinerary: any) => {
          const startDate = new Date(itinerary.startDate);
          const formattedDate = `${String(startDate.getDate()).padStart(2, "0")}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${startDate.getFullYear()}`;

          // Map API status to filter status
          // API returns: "ongoing" | "upcoming" | "past"
          // Filter expects: "upcoming" | "ongoing" | "completed"
          let filterStatus: string;
          if (itinerary.status === "ongoing") {
            filterStatus = "ongoing";
          } else if (itinerary.status === "past") {
            filterStatus = "completed";
          } else {
            filterStatus = "upcoming";
          }

          const badgeStyle = getStatusBadgeStyle(filterStatus);

          return {
            id: itinerary.id,
            title: itinerary.title,
            date: formattedDate,
            timeRange: "",
            area: itinerary.locations?.[0] || "Việt Nam",
            stopsCount: itinerary.stops?.length || 0,
            tags: [badgeStyle.label],
            stops: (itinerary.stops || []).slice(0, 3).map((stop: any) => ({
              id: stop.id,
              time: "",
              name: stop.name,
              thumbnail: stop.imageUrl,
            })),
            isSaved: false,
            status: filterStatus,
            // Store original itinerary data for posting
            originalTripData: {
              id: itinerary.id,
              title: itinerary.title,
              date: formattedDate,
              startDate: itinerary.startDate,
              startTime: itinerary.startDate,
              area: itinerary.locations?.[0] || "Việt Nam",
              stopsCount: itinerary.stops?.length || 0,
              stops: (itinerary.stops || []).map((stop: any) => ({
                id: stop.id,
                name: stop.name,
                thumbnail: stop.imageUrl,
                time: "",
              })),
            },
          };
        },
      );
      setAllItineraries(mappedItineraries);
    } catch (error) {
      console.error("Failed to load trips:", error);
      setAllItineraries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const snapPoints = useMemo(() => ["75%", "95%"], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  // Filter by status and search query
  const filteredItineraries = useMemo(() => {
    let result = allItineraries;

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((it) => it.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (it) =>
          it.title.toLowerCase().includes(query) ||
          it.area.toLowerCase().includes(query),
      );
    }

    return result;
  }, [allItineraries, statusFilter, searchQuery]);

  const handleSelect = (itinerary: ItineraryForSelection) => {
    onSelect(itinerary);
  };

  const renderStatusFilterChips = () => (
    <View style={styles.filterChipsRow}>
      {STATUS_FILTERS.map((filter) => {
        const isActive = statusFilter === filter.key;
        return (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: isActive
                  ? filter.bgColor
                  : colors.chipBackground,
                borderColor: isActive ? filter.color : colors.border,
                borderWidth: 1.5,
              },
            ]}
            onPress={() => setStatusFilter(filter.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color: isActive ? filter.color : colors.textSecondary,
                  fontWeight: isActive ? "600" : "500",
                },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderItineraryItem = useCallback(
    ({ item }: { item: ItineraryWithStatus }) => {
      const badgeStyle = getStatusBadgeStyle(item.status);

      return (
        <TouchableOpacity
          style={[
            styles.itineraryCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            {/* Title */}
            <Text
              style={[styles.itineraryTitle, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {/* Status Badge */}
            <View
              style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}
            >
              <Text
                style={[styles.statusBadgeText, { color: badgeStyle.text }]}
              >
                {badgeStyle.label}
              </Text>
            </View>
          </View>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <MaterialIcons
                name="event"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.date}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <MaterialIcons
                name="schedule"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.timeRange}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <MaterialIcons
                name="place"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.stopsCount} điểm dừng
              </Text>
            </View>
          </View>

          {/* Preview Stops */}
          {item.stops.length > 0 && (
            <View
              style={[styles.stopsPreview, { borderTopColor: colors.border }]}
            >
              {item.stops.map((stop, index) => (
                <View key={stop.id} style={styles.stopItem}>
                  <View
                    style={[
                      styles.stopDot,
                      { backgroundColor: badgeStyle.text },
                    ]}
                  />
                  <Text
                    style={[styles.stopName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {stop.name}
                  </Text>
                </View>
              ))}
              {item.stopsCount > 3 && (
                <Text
                  style={[styles.moreStops, { color: colors.textSecondary }]}
                >
                  +{item.stopsCount - 3} điểm khác
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [colors, handleSelect],
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.background,
        { backgroundColor: colors.background },
      ]}
      handleIndicatorStyle={[
        styles.indicator,
        { backgroundColor: colors.border },
      ]}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onChange={(index) => {
        if (index >= 0) {
          loadTrips();
        }
      }}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Chọn lịch trình
        </Text>
      </View>

      {/* Status Filter Chips */}
      {renderStatusFilterChips()}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: colors.chipBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialIcons name="search" size={20} color={colors.textSecondary} />
          <BottomSheetTextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm lịch trình…"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Itinerary List */}
      <BottomSheetFlatList<ItineraryWithStatus>
        data={filteredItineraries}
        keyExtractor={(item) => item.id}
        renderItem={renderItineraryItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="event-note"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {isLoading ? "Đang tải..." : "Không có lịch trình"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {statusFilter !== "all"
                ? `Không có lịch trình "${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label}"`
                : "Tạo lịch trình mới để chia sẻ"}
            </Text>
          </View>
        }
      />
    </BottomSheet>
  );
});

ChooseItinerarySheet.displayName = "ChooseItinerarySheet";

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    textAlign: "center",
  },
  filterChipsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  filterChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  searchContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.sm,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  itineraryCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  itineraryTitle: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: Typography.sizes.sm,
  },
  stopsPreview: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    gap: 6,
  },
  stopItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stopName: {
    flex: 1,
    fontSize: Typography.sizes.sm,
  },
  moreStops: {
    fontSize: Typography.sizes.sm,
    fontStyle: "italic",
    marginLeft: 20,
  },
  emptyContainer: {
    paddingVertical: Spacing.xl * 2,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  emptyText: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
  },
});
