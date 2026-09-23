/**
 * CreateChannelStep1 Component
 * First step of channel creation: name, description, type, settings
 * Matches Figma node 499:1460
 */
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { type ComponentType } from 'react';
import {
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import {
  CHANNEL_CATEGORIES,
  type ChannelCategory,
} from '../types/channel.types';
import { ChannelTypeChip } from './ChannelTypeChip';
import { StepIndicator } from './StepIndicator';
import { ToggleSettingRow } from './ToggleSettingRow';

/** Footer height constant */
const FOOTER_HEIGHT = 72;

interface CreateChannelStep1Props {
  name: string;
  onNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  category: ChannelCategory;
  onCategoryChange: (category: ChannelCategory) => void;
  allowSharing: boolean;
  onAllowSharingChange: (value: boolean) => void;
  isPrivate: boolean;
  onIsPrivateChange: (value: boolean) => void;
  onCancel: () => void;
  onNext: () => void;
  /** Custom ScrollView component (e.g., BottomSheetScrollView) */
  ScrollComponent?: ComponentType<any>;
  /** Whether inside a BottomSheet - uses BottomSheetTextInput */
  useBottomSheet?: boolean;
  /** Bottom safe area inset */
  bottomInset?: number;
}

/**
 * Step 1 form for channel creation
 */
export function CreateChannelStep1({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  category,
  onCategoryChange,
  allowSharing,
  onAllowSharingChange,
  isPrivate,
  onIsPrivateChange,
  onCancel,
  onNext,
  ScrollComponent,
  useBottomSheet = false,
  bottomInset = 0,
}: CreateChannelStep1Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const isValid = name.trim().length > 0;
  const ScrollView = ScrollComponent ?? RNScrollView;
  const TextInput = useBottomSheet ? BottomSheetTextInput : RNTextInput;
  
  // Calculate total footer height including safe area
  const totalFooterHeight = FOOTER_HEIGHT + bottomInset;

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <StepIndicator currentStep={1} />

      {/* Form Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: totalFooterHeight + Spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Channel Name */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Tên Channel
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.borderLight,
                color: colors.text,
              },
            ]}
            placeholder="Ví dụ: Du lịch Đà Nẵng 2024"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={onNameChange}
            autoCapitalize="sentences"
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Mô tả
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.borderLight,
                color: colors.text,
              },
            ]}
            placeholder="Mô tả ngắn về channel..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={onDescriptionChange}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        {/* Channel Type */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Loại Channel
          </Text>
          <View style={styles.categoryGrid}>
            {CHANNEL_CATEGORIES.map((cat) => (
              <View key={cat.id} style={styles.categoryItem}>
                <ChannelTypeChip
                  category={cat}
                  isSelected={category === cat.id}
                  onPress={() => onCategoryChange(cat.id)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Settings Toggles */}
        <View
          style={[
            styles.settingsContainer,
            { backgroundColor: colors.backgroundSecondary ?? '#f9fafb' },
          ]}
        >
          <ToggleSettingRow
            icon={
              <Ionicons name="globe-outline" size={20} color={colors.fabBlue} />
            }
            iconBackgroundColor="#dbeafe"
            title="Cho phép chia sẻ"
            description="Thành viên có thể chia sẻ nội dung"
            value={allowSharing}
            onValueChange={onAllowSharingChange}
          />
          <View
            style={[styles.separator, { backgroundColor: colors.borderLight }]}
          />
          <ToggleSettingRow
            icon={
              <MaterialIcons name="lock-outline" size={20} color="#a855f7" />
            }
            iconBackgroundColor="#f3e8ff"
            title="Channel riêng tư"
            description="Chỉ thành viên được mời mới vào"
            value={isPrivate}
            onValueChange={onIsPrivateChange}
          />
        </View>
      </ScrollView>

      {/* Footer Buttons - Absolute positioned */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background ?? '#ffffff',
            paddingBottom: bottomInset + Spacing.md,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            styles.cancelButton,
            { backgroundColor: colors.chipBackground },
          ]}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
            Hủy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            {
              backgroundColor: isValid ? colors.actionBlue : colors.borderLight,
            },
          ]}
          onPress={onNext}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.buttonText,
              { color: isValid ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Tiếp theo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: {
    height: 93,
    paddingTop: Spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryItem: {
    width: '48%',
  },
  settingsContainer: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  separator: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {},
  primaryButton: {},
  buttonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
