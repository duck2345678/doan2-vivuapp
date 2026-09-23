/**
 * CreateChannelModal Component
 * Bottom sheet modal with 2-step wizard for channel creation
 * Matches Figma nodes 499:1460 and 499:1729
 */
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import { useCreateChannel } from '../hooks/useCreateChannel';
import type { ChannelCategory, FriendPreview } from '../types/channel.types';
import { CreateChannelStep1 } from './CreateChannelStep1';
import { CreateChannelStep2 } from './CreateChannelStep2';

/** Footer height for proper scroll padding */
export const CHANNEL_MODAL_FOOTER_HEIGHT = 72;

export interface CreateChannelModalRef {
  open: () => void;
  close: () => void;
}

interface CreateChannelModalProps {
  onClose?: () => void;
}

/**
 * Bottom sheet modal for creating a new channel
 */
export const CreateChannelModal = forwardRef<
  CreateChannelModalRef,
  CreateChannelModalProps
>(function CreateChannelModal({ onClose }, ref) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ChannelCategory>('travel');
  const [allowSharing, setAllowSharing] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<FriendPreview[]>([]);

  // Create channel mutation
  const { mutate: createChannel, isPending: isCreating } = useCreateChannel();

  // Snap points: 95% height for more content space
  const snapPoints = useMemo(() => ['95%'], []);

  // Reset form state
  const resetForm = useCallback(() => {
    setStep(1);
    setName('');
    setDescription('');
    setCategory('travel');
    setAllowSharing(true);
    setIsPrivate(false);
    setSelectedMembers([]);
  }, []);

  // Expose open/close methods
  useImperativeHandle(ref, () => ({
    open: () => {
      resetForm();
      bottomSheetRef.current?.present();
    },
    close: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  // Backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    []
  );

  // Handle sheet dismiss
  const handleDismiss = useCallback(() => {
    resetForm();
    onClose?.();
  }, [resetForm, onClose]);

  // Navigation handlers
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleNext = useCallback(() => {
    setStep(2);
  }, []);

  const handleBack = useCallback(() => {
    setStep(1);
  }, []);

  const handleCreate = useCallback(() => {
    createChannel({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      allowSharing,
      isPrivate,
      memberIds: selectedMembers.map((m) => m.id),
    });
    // Close modal after initiating creation
    bottomSheetRef.current?.dismiss();
  }, [
    createChannel,
    name,
    description,
    category,
    allowSharing,
    isPrivate,
    selectedMembers,
  ]);

  // Header title based on step
  const headerTitle = step === 1 ? 'Tạo Channel mới' : 'Thêm thành viên';

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      handleComponent={() => null}
      backgroundStyle={[
        styles.sheetBackground,
        { backgroundColor: colors.background ?? '#ffffff' },
      ]}
      style={styles.sheet}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <View style={styles.container}>
        {/* Header with gradient */}
        <LinearGradient
          colors={['#2b7fff', '#155dfc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          {/* Back button (step 2 only) */}
          {step === 2 ? (
            <Pressable
              onPress={handleBack}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}

          {/* Title */}
          <Text style={styles.headerTitle}>{headerTitle}</Text>

          {/* Close button */}
          <Pressable
            onPress={handleClose}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </LinearGradient>

        {/* Step Content */}
        <View style={styles.contentWrapper}>
          {step === 1 ? (
            <CreateChannelStep1
              name={name}
              onNameChange={setName}
              description={description}
              onDescriptionChange={setDescription}
              category={category}
              onCategoryChange={setCategory}
              allowSharing={allowSharing}
              onAllowSharingChange={setAllowSharing}
              isPrivate={isPrivate}
              onIsPrivateChange={setIsPrivate}
              onCancel={handleClose}
              onNext={handleNext}
              ScrollComponent={BottomSheetScrollView}
              useBottomSheet
              bottomInset={insets.bottom}
            />
          ) : (
            <CreateChannelStep2
              selectedMembers={selectedMembers}
              onSelectedMembersChange={setSelectedMembers}
              onBack={handleBack}
              onCreate={handleCreate}
              isCreating={isCreating}
              ScrollComponent={BottomSheetScrollView}
              useBottomSheet
              bottomInset={insets.bottom}
            />
          )}
        </View>
      </View>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetBackground: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: '#FFFFFF',
  },
});
