import {
    BorderRadius,
    Colors,
    Shadows,
    Spacing,
    Typography,
} from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Predefined interests list
const AVAILABLE_INTERESTS = [
  "Du lịch",
  "Ẩm thực",
  "Âm nhạc",
  "Thể thao",
  "Đọc sách",
  "Phim ảnh",
  "Nhiếp ảnh",
  "Gaming",
  "Công nghệ",
  "Nghệ thuật",
  "Thiết kế",
  "Yoga",
  "Fitness",
  "Nấu ăn",
  "Thời trang",
  "Làm đẹp",
  "Pets",
  "Thiên nhiên",
  "Lập trình",
  "Kinh doanh",
  "Đầu tư",
  "Tâm lý học",
  "Triết học",
  "Học ngoại ngữ",
  "Thiện nguyện",
];

export interface InterestsBottomSheetProps {
  selectedInterests: string[];
  onSelect: (interest: string) => void;
  onRemove: (interest: string) => void;
}

export const InterestsBottomSheet = forwardRef<
  BottomSheetModal,
  InterestsBottomSheetProps
>(({ selectedInterests, onSelect, onRemove }, ref) => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const snapPoints = useMemo(() => ["50%", "75%"], []);

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

  const isSelected = (interest: string) => selectedInterests.includes(interest);

  const handleToggle = (interest: string) => {
    if (isSelected(interest)) {
      onRemove(interest);
    } else {
      onSelect(interest);
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.background,
        { backgroundColor: colors.card ?? "#ffffff" },
      ]}
      handleIndicatorStyle={[
        styles.indicator,
        { backgroundColor: colors.border ?? "#e2e8f0" },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Chọn sở thích
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Đã chọn {selectedInterests.length}/10
        </Text>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.chipsContainer}>
          {AVAILABLE_INTERESTS.map((interest) => {
            const selected = isSelected(interest);
            return (
              <Pressable
                key={interest}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? colors.actionBlue
                      : colors.chipBackground,
                    borderColor: selected
                      ? colors.actionBlue
                      : colors.chipBorder,
                  },
                ]}
                onPress={() => handleToggle(interest)}
                disabled={!selected && selectedInterests.length >= 10}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? "#fff" : colors.textPrimary },
                  ]}
                >
                  {interest}
                </Text>
                {selected && (
                  <MaterialIcons name="check" size={16} color="#fff" />
                )}
              </Pressable>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

InterestsBottomSheet.displayName = "InterestsBottomSheet";

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
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: Spacing.xl,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    gap: Spacing.xs,
    ...Shadows.chip,
  },
  chipText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});
