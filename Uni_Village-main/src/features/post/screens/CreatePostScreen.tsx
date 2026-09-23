import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingScreen } from "@/shared/components/feedback";
import { Button } from "@/shared/components/ui";
import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";

import { useCreatePost, usePostDetail, useUpdatePost } from "../hooks";
import { fileUploadService, type PickedFile } from "../services";

import { PostType, Visibility } from "@/lib/api/generated";
import { ChooseChannelSheet } from "../components/ChooseChannelSheet";
import { ChooseItinerarySheet } from "../components/ChooseItinerarySheet";
import { MediaPreviewGrid } from "../components/MediaPreviewGrid";
import { PostLocationChips } from "../components/PostLocationChips";
import { PostLocationPickerModal } from "../components/PostLocationPickerModal";
import { PostVisibilityDropdown } from "../components/PostVisibilityDropdown";
import { SelectedChannelCard } from "../components/SelectedChannelCard";
import { SelectedItineraryCard } from "../components/SelectedItineraryCard";
import type { PostLocation } from "../types";
import type {
  ChannelForSelection,
  ChannelVisibility,
  CreatePostTab,
  ItineraryForSelection,
} from "../types/createPost.types";

interface CreatePostScreenProps {
  initialTab?: CreatePostTab;
  postId?: string;
}

/**
 * Create Post Screen
 * Context-aware post creation based on initialTab
 */
export function CreatePostScreen({
  initialTab = "post",
  postId,
}: CreatePostScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isEditMode = !!postId;
  const resolvedPostId = useMemo(() => {
    if (!postId) return undefined;
    const parsed = parseInt(postId, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [postId]);

  const getLocationsKey = useCallback(
    (locations: PostLocation[]) =>
      locations
        .map(
          (location) =>
            `${location.id}-${location.name}-${location.lat ?? ""}-${location.lng ?? ""}`,
        )
        .join("|"),
    [],
  );

  // State
  const [activeTab, setActiveTab] = useState<CreatePostTab>(
    isEditMode ? "post" : initialTab,
  );
  const [postContent, setPostContent] = useState("");
  const [channelContent, setChannelContent] = useState("");
  const [itineraryContent, setItineraryContent] = useState("");
  const [selectedChannel, setSelectedChannel] =
    useState<ChannelForSelection | null>(null);
  const [selectedItinerary, setSelectedItinerary] =
    useState<ItineraryForSelection | null>(null);
  const [postVisibility, setPostVisibility] =
    useState<ChannelVisibility>("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<PickedFile[]>([]);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<PostLocation[]>(
    [],
  );
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [postType, setPostType] = useState<PostType>(PostType.EXPERIENCE);
  const initialSnapshotRef = useRef<{
    content: string;
    visibility: ChannelVisibility;
    locationsKey: string;
  } | null>(null);

  // Bottom sheet refs
  const channelSheetRef = useRef<BottomSheet>(null);
  const itinerarySheetRef = useRef<BottomSheet>(null);

  const { mutate: createRealPost, isPending: isCreatingRealPost } =
    useCreatePost();
  const { mutateAsync: updatePost, isPending: isUpdatingPost } =
    useUpdatePost();
  const { data: existingPost, isLoading: isLoadingPost } =
    usePostDetail(resolvedPostId);

  const canSubmit = useMemo(() => {
    if (isSubmitting || isCreatingRealPost || isUpdatingPost) return false;
    if (isEditMode) {
      const hasContent = postContent.trim().length > 0;
      const hasMedia = selectedFiles.length > 0 || existingMediaUrls.length > 0;
      const hasLocations = selectedLocations.length > 0;
      return hasContent || hasMedia || hasLocations;
    }
    switch (activeTab) {
      case "post":
        return postContent.trim().length > 0 || selectedFiles.length > 0;
      case "channel":
        return !!selectedChannel;
      case "itinerary":
        return !!selectedItinerary;
      default:
        return false;
    }
  }, [
    activeTab,
    postContent,
    selectedChannel,
    selectedItinerary,
    isSubmitting,
    isCreatingRealPost,
    isUpdatingPost,
    selectedFiles,
    existingMediaUrls.length,
    selectedLocations.length,
    isEditMode,
  ]);

  // Check if there's unsaved content
  const hasUnsavedChanges = useMemo(() => {
    if (isEditMode) {
      const snapshot = initialSnapshotRef.current;
      if (!snapshot) {
        return false;
      }
      const currentLocationsKey = getLocationsKey(selectedLocations);
      return (
        postContent !== snapshot.content ||
        postVisibility !== snapshot.visibility ||
        selectedFiles.length > 0 ||
        currentLocationsKey !== snapshot.locationsKey
      );
    }
    return (
      postContent.trim().length > 0 ||
      channelContent.trim().length > 0 ||
      itineraryContent.trim().length > 0 ||
      selectedFiles.length > 0 ||
      selectedLocations.length > 0
    );
  }, [
    postContent,
    channelContent,
    itineraryContent,
    selectedFiles.length,
    selectedLocations,
    postVisibility,
    isEditMode,
    getLocationsKey,
  ]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleRemoveFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const openLocationPicker = useCallback(() => {
    setIsLocationPickerOpen(true);
  }, []);

  const closeLocationPicker = useCallback(() => {
    setIsLocationPickerOpen(false);
  }, []);

  const handleLocationSelect = useCallback(
    (location: PostLocation) => {
      setSelectedLocations([location]);
      closeLocationPicker();
    },
    [closeLocationPicker],
  );

  const handleRemoveLocation = useCallback(() => {
    setSelectedLocations([]);
  }, []);

  const existingMediaItems = useMemo(
    () =>
      existingMediaUrls.map((uri, index) => ({ id: `existing-${index}`, uri })),
    [existingMediaUrls],
  );

  const handleClose = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Huỷ bài viết?",
        "Bạn có chắc muốn huỷ? Nội dung sẽ bị mất.",
        [
          { text: "Tiếp tục chỉnh sửa", style: "cancel" },
          {
            text: "Huỷ bài viết",
            style: "destructive",
            onPress: () => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.back();
            },
          },
        ],
      );
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (isEditMode && !resolvedPostId) return;

    setIsSubmitting(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      if (isEditMode && resolvedPostId) {
        await updatePost({
          postId: resolvedPostId,
          data: {
            content: postContent,
            postType,
            visibility:
              postVisibility === "public"
                ? Visibility.PUBLIC
                : Visibility.PRIVATE,
            files: selectedFiles.length > 0 ? selectedFiles : undefined,
            locations:
              selectedLocations.length > 0 ? selectedLocations : undefined,
          },
        });
      } else if (activeTab === "post") {
        createRealPost({
          content: postContent,
          postType: PostType.EXPERIENCE,
          visibility:
            postVisibility === "public"
              ? Visibility.PUBLIC
              : Visibility.PRIVATE,
          files: selectedFiles,
          locations:
            selectedLocations.length > 0 ? selectedLocations : undefined,
        });
      } else if (activeTab === "itinerary" && selectedItinerary) {
        // Post itinerary with embedded trip data for ItineraryShareCard rendering
        const tripShareData = {
          id: selectedItinerary.id,
          title: selectedItinerary.title,
          date: selectedItinerary.date,
          timeRange: selectedItinerary.timeRange,
          area: selectedItinerary.area || "TP.HCM",
          stopsCount: selectedItinerary.stopsCount,
          stops: (selectedItinerary.stops || []).map((stop: any) => ({
            id: stop.id,
            time: stop.time || "",
            name: stop.name,
            thumbnail: stop.thumbnail,
          })),
        };

        // Create content with trip data marker for PostCard to detect
        const stopsText =
          selectedItinerary.stops?.map((s: any) => `• ${s.name}`).join("\n") ||
          "";
        const description =
          itineraryContent ||
          `📅 ${selectedItinerary.title}\n\n` +
            `🗓️ Ngày: ${selectedItinerary.date}\n` +
            `⏰ Giờ: ${selectedItinerary.timeRange}\n` +
            `📍 ${selectedItinerary.stopsCount} điểm dừng\n\n` +
            (stopsText ? `Các điểm đến:\n${stopsText}` : "");

        // Embed trip data as JSON with marker
        const contentWithTripData = `${description}\n\n[ITINERARY_SHARE]${JSON.stringify(tripShareData)}[/ITINERARY_SHARE]`;

        createRealPost({
          content: contentWithTripData,
          postType: PostType.EXPERIENCE,
          visibility:
            postVisibility === "public"
              ? Visibility.PUBLIC
              : Visibility.PRIVATE,
        });
      } else if (activeTab === "channel" && selectedChannel) {
        // Create channel share data for embedding in post
        const channelShareData = {
          channelId: selectedChannel.id,
          name: selectedChannel.name,
          emoji: selectedChannel.emoji,
          description: selectedChannel.description || "",
          memberCount: selectedChannel.memberCount || 0,
        };

        // Create description text for the post
        const description =
          channelContent ||
          `📢 Mời tham gia Channel: ${selectedChannel.name}\n\n` +
            (selectedChannel.description
              ? `${selectedChannel.description}\n\n`
              : "") +
            `👥 ${selectedChannel.memberCount || 0} thành viên`;

        // Embed channel data as JSON with marker
        const contentWithChannelData = `${description}\n\n[CHANNEL_SHARE]${JSON.stringify(channelShareData)}[/CHANNEL_SHARE]`;

        createRealPost({
          content: contentWithChannelData,
          postType: PostType.EXPERIENCE,
          visibility:
            postVisibility === "public"
              ? Visibility.PUBLIC
              : Visibility.PRIVATE,
        });
      }

      setIsSubmitting(false);
      router.back();
    } catch (error) {
      console.error(
        isEditMode ? "Failed to update post:" : "Failed to create post:",
        error,
      );
      setIsSubmitting(false);
    }
  };

  const openChannelSheet = useCallback(() => {
    channelSheetRef.current?.expand();
  }, []);

  const closeChannelSheet = useCallback(() => {
    channelSheetRef.current?.close();
  }, []);

  const openItinerarySheet = useCallback(() => {
    itinerarySheetRef.current?.expand();
  }, []);

  const closeItinerarySheet = useCallback(() => {
    itinerarySheetRef.current?.close();
  }, []);

  const handleChannelSelect = useCallback(
    (channel: ChannelForSelection) => {
      setSelectedChannel(channel);
      closeChannelSheet();
    },
    [closeChannelSheet],
  );

  const handleItinerarySelect = useCallback(
    (itinerary: ItineraryForSelection) => {
      setSelectedItinerary(itinerary);
      closeItinerarySheet();
    },
    [closeItinerarySheet],
  );

  useEffect(() => {
    if (!isEditMode || !existingPost) return;

    setActiveTab("post");
    setPostContent(existingPost.content ?? "");
    setPostVisibility(
      existingPost.visibility === Visibility.PUBLIC ? "public" : "private",
    );
    setExistingMediaUrls(existingPost.mediaUrls ?? []);
    setPostType(existingPost.postType ?? PostType.EXPERIENCE);
    setSelectedLocations((existingPost as any).locations ?? []);
    setSelectedFiles([]);
    initialSnapshotRef.current = {
      content: existingPost.content ?? "",
      visibility:
        existingPost.visibility === Visibility.PUBLIC ? "public" : "private",
      locationsKey: getLocationsKey((existingPost as any).locations ?? []),
    };
  }, [isEditMode, existingPost, getLocationsKey]);

  // Get header title based on initialTab
  const getHeaderTitle = () => {
    if (isEditMode) {
      return "Edit Post";
    }
    switch (initialTab) {
      case "post":
        return "Tạo bài viết";
      case "channel":
        return "Chia sẻ Channel";
      case "itinerary":
        return "Chia sẻ lịch trình";
      default:
        return "Tạo bài viết";
    }
  };

  // Auto-open bottom sheets when initialTab is channel or itinerary
  useEffect(() => {
    if (isEditMode) {
      return;
    }
    if (initialTab === "channel" && !selectedChannel) {
      // Small delay to ensure bottom sheet is mounted
      setTimeout(() => {
        openChannelSheet();
      }, 300);
    } else if (initialTab === "itinerary" && !selectedItinerary) {
      setTimeout(() => {
        openItinerarySheet();
      }, 300);
    }
  }, [
    initialTab,
    selectedChannel,
    selectedItinerary,
    openChannelSheet,
    openItinerarySheet,
    isEditMode,
  ]);

  const getPlaceholder = () => {
    switch (activeTab) {
      case "post":
        return "Chia sẻ cảm nghĩ của bạn…";
      case "channel":
        return "Viết gì đó cho Channel này…";
      case "itinerary":
        return "Mô tả ngắn về lịch trình (tuỳ chọn)…";
      default:
        return "";
    }
  };

  const getCurrentContent = () => {
    switch (activeTab) {
      case "post":
        return postContent;
      case "channel":
        return channelContent;
      case "itinerary":
        return itineraryContent;
      default:
        return "";
    }
  };

  const setCurrentContent = (text: string) => {
    switch (activeTab) {
      case "post":
        setPostContent(text);
        break;
      case "channel":
        setChannelContent(text);
        break;
      case "itinerary":
        setItineraryContent(text);
        break;
    }
  };

  const renderEmptyState = () => {
    if (activeTab === "channel" && !selectedChannel) {
      return (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.chipBackground },
            ]}
          >
            <Text
              style={[styles.emptyIconText, { color: colors.textSecondary }]}
            >
              #
            </Text>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Chưa chọn Channel
          </Text>
          <Button
            title="Chọn Channel"
            onPress={openChannelSheet}
            variant="primary"
            size="md"
          />
        </View>
      );
    }

    if (activeTab === "itinerary" && !selectedItinerary) {
      return (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.chipBackground },
            ]}
          >
            <MaterialIcons
              name="event-note"
              size={32}
              color={colors.textSecondary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Chưa chọn lịch trình
          </Text>
          <Button
            title="Chọn lịch trình"
            onPress={openItinerarySheet}
            variant="primary"
            size="md"
          />
        </View>
      );
    }

    return null;
  };

  const renderSelectedContent = () => {
    if (activeTab === "channel" && selectedChannel) {
      return (
        <View style={styles.selectedContent}>
          <SelectedChannelCard
            channel={selectedChannel}
            onChangeChannel={openChannelSheet}
          />
        </View>
      );
    }

    if (activeTab === "itinerary" && selectedItinerary) {
      return (
        <View style={styles.selectedContent}>
          <SelectedItineraryCard
            itinerary={selectedItinerary}
            onChangeItinerary={openItinerarySheet}
          />
        </View>
      );
    }

    return null;
  };

  const shouldShowEmptyState =
    (activeTab === "channel" && !selectedChannel) ||
    (activeTab === "itinerary" && !selectedItinerary);

  if (isEditMode && isLoadingPost) {
    return <LoadingScreen message="Loading post..." />;
  }

  if (isEditMode && resolvedPostId && !isLoadingPost && !existingPost) {
    return <LoadingScreen message="Post not found." />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {getHeaderTitle()}
        </Text>

        <Button
          title="Đăng"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
          size="sm"
          variant={canSubmit ? "primary" : "outline"}
        />
      </View>

      {/* Content */}
      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Text Input - always shown unless empty state */}
            {!shouldShowEmptyState && (
              <>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder={getPlaceholder()}
                  placeholderTextColor={colors.textSecondary}
                  value={getCurrentContent()}
                  onChangeText={setCurrentContent}
                  multiline
                  autoFocus={activeTab === "post"}
                  textAlignVertical="top"
                />

                {activeTab === "post" && selectedLocations.length > 0 && (
                  <View style={styles.locationSection}>
                    <PostLocationChips locations={selectedLocations} />
                    <TouchableOpacity
                      style={styles.removeLocationButton}
                      onPress={handleRemoveLocation}
                    >
                      <Text
                        style={[
                          styles.removeLocationText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Remove location
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Media Preview Grid */}
                {activeTab === "post" &&
                  isEditMode &&
                  existingMediaItems.length > 0 && (
                    <View style={styles.mediaSection}>
                      <Text
                        style={[
                          styles.mediaLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Current images
                      </Text>
                      <MediaPreviewGrid files={existingMediaItems} />
                      {selectedFiles.length > 0 && (
                        <Text
                          style={[
                            styles.mediaHint,
                            { color: colors.textSecondary },
                          ]}
                        >
                          New images will replace current ones.
                        </Text>
                      )}
                    </View>
                  )}

                {activeTab === "post" && selectedFiles.length > 0 && (
                  <View style={styles.mediaSection}>
                    {isEditMode && (
                      <Text
                        style={[
                          styles.mediaLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        New images
                      </Text>
                    )}
                    <MediaPreviewGrid
                      files={selectedFiles}
                      onRemove={handleRemoveFile}
                    />
                  </View>
                )}
              </>
            )}

            {/* Empty state for Channel/Itinerary */}
            {renderEmptyState()}

            {/* Selected Channel/Itinerary cards */}
            {renderSelectedContent()}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* Bottom toolbar */}
      <View
        style={[
          styles.toolbar,
          {
            paddingBottom: insets.bottom + Spacing.sm,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={async () => {
            try {
              const files = await fileUploadService.pickImages(true);
              setSelectedFiles((prev) => [...prev, ...files]);
            } catch (error) {
              console.error("Failed to pick images:", error);
            }
          }}
        >
          <MaterialIcons name="image" size={24} color="#6A7282" />
          <Text style={[styles.toolbarText, { color: "#6A7282" }]}>
            Ảnh {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={openLocationPicker}
        >
          <MaterialIcons name="location-on" size={24} color="#6A7282" />
          <Text style={[styles.toolbarText, { color: "#6A7282" }]}>Vị trí</Text>
        </TouchableOpacity>

        {activeTab === "post" && (
          <PostVisibilityDropdown
            visibility={postVisibility}
            onVisibilityChange={setPostVisibility}
          />
        )}
      </View>

      {/* Bottom Sheets */}
      <ChooseChannelSheet
        ref={channelSheetRef}
        onSelect={handleChannelSelect}
      />
      <ChooseItinerarySheet
        ref={itinerarySheetRef}
        onSelect={handleItinerarySelect}
      />
      <PostLocationPickerModal
        isVisible={isLocationPickerOpen}
        onClose={closeLocationPicker}
        onSelect={handleLocationSelect}
      />
    </KeyboardAvoidingView>
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
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    flexGrow: 1,
  },
  textInput: {
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    minHeight: 120,
  },
  mediaSection: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  mediaLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  mediaHint: {
    fontSize: Typography.sizes.sm,
  },
  locationSection: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  removeLocationButton: {
    alignSelf: "flex-start",
  },
  removeLocationText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyIconText: {
    fontSize: 32,
    fontWeight: Typography.weights.bold,
  },
  emptyTitle: {
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.sm,
  },
  selectedContent: {
    marginTop: Spacing.md,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.lg,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  toolbarText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});
