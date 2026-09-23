import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useImagePicker,
  useMyProfile,
  useUpdateProfile,
  useUploadAvatar,
  useUploadCover,
} from "../hooks";
import { editProfileSchema, type EditProfileFormData } from "../schemas";
import { EditProfileFormRow } from "./EditProfileFormRow";
import { EditProfileFormSection } from "./EditProfileFormSection";
import { EditProfileHeader } from "./EditProfileHeader";
import { InterestChips } from "./InterestChips";
import { InterestsBottomSheet } from "./InterestsBottomSheet";
import { ProfileFAB } from "./ProfileFAB";

export function EditProfileScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { showImagePickerOptions: showAvatarPicker } = useImagePicker({
    aspect: [1, 1],
    quality: 0.8,
  });
  const { showImagePickerOptions: showCoverPicker } = useImagePicker({
    aspect: [16, 9],
    quality: 0.8,
  });

  // Fetch current user profile
  const { profile, isLoading: isProfileLoading } = useMyProfile();

  // Update profile mutation
  const { updateProfile, isPending: isSubmitting } = useUpdateProfile({
    onSuccess: () => {
      router.back();
    },
    onError: (error) => {
      console.error("Failed to save profile:", error);
      Alert.alert("Lỗi", "Không thể lưu thay đổi. Vui lòng thử lại.", [
        { text: "OK" },
      ]);
    },
  });

  // Upload image mutations
  const { uploadAvatar, isPending: isUploadingAvatar } = useUploadAvatar({
    onSuccess: (data) => {
      // Update form with the server-returned avatar URL
      if (data.avatarUrl) {
        setValue("avatarUrl", data.avatarUrl, { shouldDirty: true });
      }
    },
    onError: (error) => {
      console.error("Failed to upload avatar:", error);
      Alert.alert("Lỗi", "Không thể tải ảnh đại diện lên. Vui lòng thử lại.", [
        { text: "OK" },
      ]);
    },
  });

  const { uploadCover, isPending: isUploadingCover } = useUploadCover({
    onSuccess: (data) => {
      // Update form with the server-returned cover URL
      if (data.coverUrl) {
        setValue("coverUrl", data.coverUrl, { shouldDirty: true });
      }
    },
    onError: (error) => {
      console.error("Failed to upload cover:", error);
      Alert.alert("Lỗi", "Không thể tải ảnh bìa lên. Vui lòng thử lại.", [
        { text: "OK" },
      ]);
    },
  });

  // React Hook Form setup with zod resolver
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      avatarUrl: undefined as string | undefined,
      coverUrl: undefined as string | undefined,
      interests: [] as string[],
      isPrivate: false,
    },
    mode: "onChange",
  });

  // Update form when profile data loads
  React.useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? "",
        avatarUrl: profile.avatarUrl ?? undefined,
        coverUrl: profile.coverUrl ?? undefined,
        interests: profile.interests ?? [],
        isPrivate: profile.isPrivate ?? false,
      });
    }
  }, [profile, reset]);

  const rawInterests = watch("interests");
  const watchedInterests = useMemo(() => rawInterests ?? [], [rawInterests]);
  const watchedBio = watch("bio") ?? "";
  const watchedIsPrivate = watch("isPrivate") ?? false;
  const watchedAvatarUrl = watch("avatarUrl");

  // Handlers
  const handleCancel = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        "Hủy thay đổi?",
        "Bạn có thay đổi chưa được lưu. Bạn có chắc muốn thoát?",
        [
          { text: "Tiếp tục chỉnh sửa", style: "cancel" },
          {
            text: "Hủy thay đổi",
            style: "destructive",
            onPress: () => {
              router.back();
            },
          },
        ],
      );
    } else {
      router.back();
    }
  }, [isDirty]);

  const onSubmit = async (data: EditProfileFormData) => {
    try {
      await updateProfile({
        displayName: data.displayName,
        bio: data.bio || undefined,
        avatarUrl: data.avatarUrl,
        coverUrl: data.coverUrl,
        interests: data.interests,
        isPrivate: data.isPrivate,
      });
    } catch (error) {
      // Error handled in useUpdateProfile
    }
  };

  const handleChangeAvatar = useCallback(async () => {
    const result = await showAvatarPicker();
    if (result) {
      // Upload image to server first, then the server returns updated profile with avatarUrl
      const fileName = result.uri.split("/").pop() || "avatar.jpg";
      const fileType = result.type || "image/jpeg";
      await uploadAvatar({
        uri: result.uri,
        name: fileName,
        type: fileType,
      });
    }
  }, [showAvatarPicker, uploadAvatar]);

  const handleChangeCover = useCallback(async () => {
    const result = await showCoverPicker();
    if (result) {
      // Upload image to server first, then the server returns updated profile with coverUrl
      const fileName = result.uri.split("/").pop() || "cover.jpg";
      const fileType = result.type || "image/jpeg";
      await uploadCover({
        uri: result.uri,
        name: fileName,
        type: fileType,
      });
    }
  }, [showCoverPicker, uploadCover]);

  const handleOpenInterests = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleAddInterest = useCallback(
    (interest: string) => {
      const current = watchedInterests;
      if (!current.includes(interest) && current.length < 10) {
        setValue("interests", [...current, interest], { shouldDirty: true });
      }
    },
    [watchedInterests, setValue],
  );

  const handleRemoveInterest = useCallback(
    (interest: string) => {
      const current = watchedInterests;
      setValue(
        "interests",
        current.filter((i) => i !== interest),
        { shouldDirty: true },
      );
    },
    [watchedInterests, setValue],
  );

  const handlePrivacyPress = useCallback(() => {
    setValue("isPrivate", !watchedIsPrivate, { shouldDirty: true });
  }, [setValue, watchedIsPrivate]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.headerWrapper, { backgroundColor: colors.card }]}>
        <EditProfileHeader
          title="Chỉnh sửa trang cá nhân"
          onCancel={handleCancel}
          onDone={handleSubmit(onSubmit)}
          isLoading={isSubmitting || isUploadingAvatar || isUploadingCover}
          isDoneDisabled={!isDirty || isUploadingAvatar || isUploadingCover}
        />
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Form Card */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              {/* Name Section - Editable */}
              <EditProfileFormSection label="Tên hiển thị">
                <View style={styles.nameRow}>
                  <Controller
                    control={control}
                    name="displayName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.displayNameInput,
                          { color: colors.textPrimary },
                        ]}
                        placeholder="Nhập tên hiển thị"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={50}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    )}
                  />
                  <ProfileFAB onPress={handleChangeAvatar} absolute={false} />
                </View>
                {errors.displayName && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.displayName.message}
                  </Text>
                )}
              </EditProfileFormSection>

              {/* Bio Section - Editable */}
              <EditProfileFormSection label="Tiểu sử">
                <Controller
                  control={control}
                  name="bio"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                      <TextInput
                        style={[
                          styles.bioInput,
                          {
                            color: colors.textPrimary,
                            backgroundColor: "transparent",
                          },
                        ]}
                        placeholder="Viết tiểu sử..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        maxLength={150}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        textAlignVertical="top"
                      />
                      <Text
                        style={[
                          styles.charCount,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {watchedBio.length}/150
                      </Text>
                    </View>
                  )}
                />
                {errors.bio && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.bio.message}
                  </Text>
                )}
              </EditProfileFormSection>

              {/* Interests Section */}
              <EditProfileFormSection label="Sở thích">
                <InterestChips
                  interests={watchedInterests}
                  onRemove={handleRemoveInterest}
                  onAddPress={handleOpenInterests}
                />
              </EditProfileFormSection>

              {/* Privacy Section */}
              <View style={styles.privacySection}>
                <EditProfileFormRow
                  label="Quyền riêng tư trang cá nhân"
                  value={watchedIsPrivate ? "Riêng tư" : "Công khai"}
                  onPress={handlePrivacyPress}
                  showBorder={false}
                />
                <Text
                  style={[styles.privacyHint, { color: colors.textSecondary }]}
                >
                  {watchedIsPrivate
                    ? "Chỉ những người theo dõi mới có thể xem nội dung của bạn"
                    : "Mọi người đều có thể xem nội dung của bạn"}
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Interests Bottom Sheet */}
      <InterestsBottomSheet
        ref={bottomSheetRef}
        selectedInterests={watchedInterests}
        onSelect={handleAddInterest}
        onRemove={handleRemoveInterest}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerWrapper: {
    zIndex: 1,
  },
  mainContent: {
    flex: 1,
    position: "relative",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xl,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  nameFieldFlex: {
    flex: 1,
  },
  formCard: {
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
  nameField: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  nameText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.normal,
  },
  displayNameInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  bioInput: {
    fontSize: Typography.sizes.md,
    minHeight: 80,
    padding: 0,
  },
  charCount: {
    fontSize: Typography.sizes.sm,
    textAlign: "right",
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.xs,
  },
  addActionText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.normal,
  },
  privacySection: {
    paddingBottom: Spacing.sm,
  },
  privacyHint: {
    fontSize: Typography.sizes.sm,
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.sm,
  },
});
