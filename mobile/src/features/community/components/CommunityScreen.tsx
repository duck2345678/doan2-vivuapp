import { Ionicons } from "@expo/vector-icons";
import { Href, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAuthStore } from "@/features/auth";
import { useMyProfile } from "@/features/profile";

import { ReportModal } from "@/components/ReportModal";
import { ReportSuccessModal } from "@/components/ReportSuccessModal";
import { SaveSuccessModal } from "@/components/SaveSuccessModal";
import { ItineraryDetailsSheet } from "@/features/itinerary/components/ItineraryDetailsSheet";
import type { ItineraryShareData } from "@/features/itinerary/types/itinerary.types";
import { useDeletePost, useUpdatePost } from "@/features/post/hooks";
import type { CreatePostTab } from "@/features/post/types/createPost.types";
import {
  EmptyState,
  ErrorMessage,
  LoadingScreen,
} from "@/shared/components/feedback";
import { PostLocationDetailSheet } from "@/shared/components/post";
import { Colors, Spacing } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { PostType, Visibility } from "@/shared/types/backend.types";
import {
  useBlockPost,
  useCommunityPosts,
  useLikePost,
  useReportPost,
  useSavePost,
} from "../hooks";
import type {
  CommunityPost,
  CommunityTab,
  ContentFilterTab,
  PostLocation,
  PostVisibility,
} from "../types";

import { CommunityFAB } from "./CommunityFAB";
import { CommunityHeader } from "./CommunityHeader";
import { CommunitySearchBar } from "./CommunitySearchBar";
import { CommunitySegmentedTabs } from "./CommunitySegmentedTabs";
import { ContentTabChips } from "./ContentTabChips";
import { MessagesTab } from "./MessagesTab";
import { PostCard } from "./PostCard";
import { PostOverflowMenu } from "./PostOverflowMenu";
import { PostOwnerMenu } from "./PostOwnerMenu";

export function CommunityScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const { profile: myProfile } = useMyProfile();
  const currentUserId = currentUser?.id ?? myProfile?.userId;

  const [activeTab, setActiveTab] = useState<CommunityTab>("posts");
  const [contentFilterTab, setContentFilterTab] =
    useState<ContentFilterTab>("posts");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [isEditPrivacyOpen, setIsEditPrivacyOpen] = useState(false);
  const [selectedPostVisibility, setSelectedPostVisibility] =
    useState<PostVisibility>("public");
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [selectedItinerary, setSelectedItinerary] =
    useState<ItineraryShareData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PostLocation | null>(
    null,
  );
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReportSuccessModalOpen, setIsReportSuccessModalOpen] =
    useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [isSaveSuccessModalOpen, setIsSaveSuccessModalOpen] = useState(false);
  const [lastSaveResult, setLastSaveResult] = useState<boolean>(true);

  // Dynamic search placeholder based on content filter tab
  const getSearchPlaceholder = () => {
    switch (contentFilterTab) {
      case "itineraries":
        return "Tìm kiếm lịch trình...";
      case "channels":
        return "Tìm kiếm Channel...";
      default:
        return "Tìm kiếm bài viết...";
    }
  };

  const { data, isLoading, refetch, isRefetching, isError, error } =
    useCommunityPosts();
  const { mutate: likePost, isPending: isLikingPost } = useLikePost();
  const { mutate: savePost, isPending: isSavingPost } = useSavePost();
  const { mutate: reportPost, isPending: isReportingPost } = useReportPost();
  const { mutate: blockPost, isPending: isBlockingPost } = useBlockPost();
  const { mutate: updatePost, isPending: isUpdatingPost } = useUpdatePost();
  const { mutate: deletePost, isPending: isDeletingPost } = useDeletePost();

  // Refetch posts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Check if the selected post belongs to current user
  const selectedPost = useMemo(() => {
    if (!selectedPostId || !data?.data) return null;
    return data.data.find((post) => post.id === selectedPostId) || null;
  }, [selectedPostId, data?.data]);

  // Helper function to check if a post is owned by current user
  // Handles both production (auth store) and development (mock data with 'current-user' ID)
  const isPostOwner = useCallback(
    (post: CommunityPost) => {
      if (!post?.author?.id) {
        return false;
      }
      // Check for mock data 'current-user' ID
      if (post.author.id === "current-user") {
        return true;
      }
      // Check for actual authenticated user
      if (currentUserId && String(post.author.id) === String(currentUserId)) {
        return true;
      }
      return false;
    },
    [currentUserId],
  );

  const isSelectedPostOwner = useMemo(() => {
    if (!selectedPost) return false;
    return isPostOwner(selectedPost);
  }, [selectedPost, isPostOwner]);

  const handleMenuPress = useCallback(
    (postId: string) => {
      const post = data?.data.find((p) => p.id === postId);
      if (!post) return;

      const isOwner = isPostOwner(post);

      setSelectedPostId(postId);
      if (isOwner) {
        setSelectedPostVisibility(post.visibility || "public");
        setIsOwnerMenuOpen(true);
      } else {
        setIsMenuOpen(true);
      }
    },
    [data?.data, isPostOwner],
  );

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
    setIsOwnerMenuOpen(false);
    setSelectedPostId(null);
  }, []);

  const handleLikePress = useCallback(
    (postId: string) => {
      if (!isLikingPost) {
        likePost(postId);
      }
    },
    [likePost, isLikingPost],
  );

  const handleCommentPress = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}` as any);
    },
    [router],
  );

  const handleLocationPress = useCallback((location: PostLocation) => {
    setSelectedLocation(location);
    setIsLocationSheetOpen(true);
  }, []);

  const handleAvatarPress = useCallback(
    (authorId: string) => {
      console.log("Avatar pressed, navigating to profile:", authorId);
      if (authorId) {
        router.push(`/profile/${authorId}` as any);
      }
    },
    [router],
  );

  const handleCloseLocationSheet = useCallback(() => {
    setIsLocationSheetOpen(false);
    setSelectedLocation(null);
  }, []);

  const handleSavePost = useCallback(
    (postId: string) => {
      if (!isSavingPost) {
        savePost(postId, {
          onSuccess: (response) => {
            const isSaved = response?.result?.isSaved ?? true;
            setLastSaveResult(isSaved);
            setIsSaveSuccessModalOpen(true);
          },
        });
      }
    },
    [savePost, isSavingPost],
  );

  const handleReportPost = useCallback((postId: string) => {
    setReportTargetId(postId);
    setIsReportModalOpen(true);
    setIsMenuOpen(false);
  }, []);

  const handleSubmitReport = useCallback(
    (reason: string) => {
      if (reportTargetId && !isReportingPost) {
        reportPost(
          { postId: reportTargetId, reason },
          {
            onSuccess: () => {
              setIsReportModalOpen(false);
              setIsReportSuccessModalOpen(true);
              // Post will be removed by query invalidation
            },
            onError: () => {
              // Error toast already shown in mutation
              setIsReportModalOpen(false);
              setReportTargetId(null);
            },
          },
        );
      }
    },
    [reportTargetId, reportPost, isReportingPost],
  );

  const handleBlockPost = useCallback(
    (postId: string) => {
      if (!isBlockingPost) {
        blockPost(postId);
      }
    },
    [blockPost, isBlockingPost],
  );

  // Owner menu handlers
  const handleEditPrivacy = useCallback(
    (postId: string) => {
      const post = data?.data.find((p) => p.id === postId);
      if (post) {
        setSelectedPostVisibility(post.visibility || "public");
        // Close owner menu first, then open edit privacy sheet after a short delay
        // to avoid race condition between two bottom sheets
        setIsOwnerMenuOpen(false);
        setTimeout(() => {
          setIsEditPrivacyOpen(true);
        }, 150);
      }
    },
    [data?.data],
  );

  const handleEditPost = useCallback(
    (postId: string) => {
      router.push({ pathname: "/post/edit", params: { postId } } as any);
    },
    [router],
  );

  const handleMoveToTrash = useCallback(
    (postId: string) => {
      if (isDeletingPost) return;
      Alert.alert("Delete post", "This will permanently delete your post.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePost(Number(postId)),
        },
      ]);
    },
    [deletePost, isDeletingPost],
  );

  const handleUpdateVisibility = useCallback(
    (postId: string, visibility: PostVisibility) => {
      const post = data?.data.find((item) => item.id === postId);
      if (!post || isUpdatingPost) return;

      updatePost({
        postId: Number(postId),
        data: {
          postType: post.postType ?? PostType.EXPERIENCE,
          visibility:
            visibility === "public" ? Visibility.PUBLIC : Visibility.PRIVATE,
        },
      });
    },
    [data?.data, updatePost, isUpdatingPost],
  );

  const handleCloseEditPrivacy = useCallback(() => {
    setIsEditPrivacyOpen(false);
  }, []);

  const handleCreatePost = useCallback(() => {
    // Map content filter tab to create post tab
    const tabMap: Record<ContentFilterTab, CreatePostTab> = {
      posts: "post",
      itineraries: "itinerary",
      channels: "channel",
    };

    router.push({
      pathname: "/post/create",
      params: { initialTab: tabMap[contentFilterTab] },
    } as any);
  }, [router, contentFilterTab]);

  const handleViewItineraryDetails = useCallback(
    (itinerary: ItineraryShareData) => {
      setSelectedItinerary(itinerary);
      setIsSheetVisible(true);
    },
    [],
  );

  const handleOpenItinerary = useCallback((itinerary: ItineraryShareData) => {
    setSelectedItinerary(itinerary);
    setIsSheetVisible(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setIsSheetVisible(false);
    setSelectedItinerary(null);
  }, []);

  const handleOpenMap = useCallback(() => {
    console.log("Open map for itinerary");
    handleCloseSheet();
  }, [handleCloseSheet]);

  const handleSaveItinerary = useCallback(() => {
    console.log("Save itinerary");
  }, []);

  const renderPostItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PostCard
        post={item}
        onMenuPress={handleMenuPress}
        onLikePress={handleLikePress}
        onCommentPress={handleCommentPress}
        onLocationPress={handleLocationPress}
        onAvatarPress={handleAvatarPress}
        onViewItineraryDetails={
          item.itineraryShare
            ? () => handleViewItineraryDetails(item.itineraryShare!)
            : undefined
        }
        onOpenItinerary={
          item.itineraryShare
            ? () => handleOpenItinerary(item.itineraryShare!)
            : undefined
        }
      />
    ),
    [
      handleMenuPress,
      handleLikePress,
      handleCommentPress,
      handleLocationPress,
      handleAvatarPress,
      handleViewItineraryDetails,
      handleOpenItinerary,
    ],
  );

  const keyExtractor = useCallback((item: CommunityPost) => item.id, []);

  // Filter posts by search query first
  const searchFilteredPosts =
    data?.data.filter((post) =>
      searchQuery
        ? post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.author.displayName
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        : true,
    ) || [];

  // Helper function to check if content has embedded itinerary
  const hasEmbeddedItinerary = (content: string): boolean => {
    return content.includes("[ITINERARY_SHARE]");
  };

  // Then filter by content type based on active chip
  const filteredPosts = searchFilteredPosts.filter((post) => {
    // Check for embedded itinerary in content
    const hasEmbedded = hasEmbeddedItinerary(post.content || "");

    switch (contentFilterTab) {
      case "itineraries":
        // Show posts with itineraryShare OR embedded itinerary in content
        return !!post.itineraryShare || hasEmbedded;
      case "channels":
        return !!post.channelInvite;
      default:
        // 'posts' = show all posts
        return true;
    }
  });

  if (isLoading) {
    return <LoadingScreen message="Đang tải bài viết..." />;
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Không thể tải bài viết"
        message={(error as any)?.message || "Vui lòng kiểm tra kết nối mạng"}
        onRetry={() => refetch()}
        retryLabel="Thử lại"
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <View
        testID="community-screen"
        style={[
          styles.container,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <CommunityHeader />

        <CommunitySegmentedTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === "posts" ? (
          <>
            <CommunitySearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={getSearchPlaceholder()}
            />

            <ContentTabChips
              activeTab={contentFilterTab}
              onTabChange={setContentFilterTab}
            />

            <FlatList
              data={filteredPosts}
              renderItem={renderPostItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor={colors.actionBlue}
                />
              }
              ListEmptyComponent={
                <View>
                  <EmptyState
                    title={
                      contentFilterTab === "itineraries"
                        ? "Chưa có lịch trình"
                        : contentFilterTab === "channels"
                          ? "Chưa có Channel"
                          : "Chưa có bài viết"
                    }
                    message={
                      contentFilterTab === "itineraries"
                        ? "Tạo lịch trình đầu tiên của bạn"
                        : contentFilterTab === "channels"
                          ? "Tạo hoặc tham gia Channel"
                          : "Hãy chia sẻ trải nghiệm của bạn"
                    }
                  />
                  {contentFilterTab === "channels" && (
                    <TouchableOpacity
                      style={[
                        styles.discoverButton,
                        { backgroundColor: colors.actionBlue },
                      ]}
                      onPress={() => router.push("/channel/discover" as Href)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="compass-outline"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.discoverButtonText}>
                        Khám phá Channels công khai
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              ListHeaderComponent={
                contentFilterTab === "channels" ? (
                  <TouchableOpacity
                    style={[
                      styles.discoverHeader,
                      { backgroundColor: colors.background },
                    ]}
                    onPress={() => router.push("/channel/discover" as Href)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.discoverHeaderLeft}>
                      <Ionicons
                        name="compass-outline"
                        size={22}
                        color={colors.actionBlue}
                      />
                      <Text
                        style={[
                          styles.discoverHeaderText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Khám phá Channels công khai
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                ) : null
              }
            />

            <CommunityFAB onPress={handleCreatePost} />

            <PostOverflowMenu
              isOpen={isMenuOpen}
              onClose={handleMenuClose}
              postId={selectedPostId || ""}
              onSave={handleSavePost}
              onReport={handleReportPost}
              onBlock={handleBlockPost}
            />

            <PostOwnerMenu
              isOpen={isOwnerMenuOpen}
              onClose={handleMenuClose}
              postId={selectedPostId || ""}
              onSave={handleSavePost}
              onEditPost={handleEditPost}
              onMoveToTrash={handleMoveToTrash}
            />

            <ItineraryDetailsSheet
              isVisible={isSheetVisible}
              itinerary={selectedItinerary}
              onClose={handleCloseSheet}
              onOpenMap={handleOpenMap}
              onSave={handleSaveItinerary}
            />
            <PostLocationDetailSheet
              isOpen={isLocationSheetOpen}
              location={selectedLocation}
              onClose={handleCloseLocationSheet}
            />

            <ReportModal
              visible={isReportModalOpen}
              onClose={() => {
                setIsReportModalOpen(false);
                setReportTargetId(null);
              }}
              onSubmit={handleSubmitReport}
              targetType="post"
              isLoading={isReportingPost}
            />

            <ReportSuccessModal
              visible={isReportSuccessModalOpen}
              onClose={() => {
                setIsReportSuccessModalOpen(false);
                setReportTargetId(null);
              }}
              targetType="post"
            />

            <SaveSuccessModal
              visible={isSaveSuccessModalOpen}
              onClose={() => setIsSaveSuccessModalOpen(false)}
              isSaved={lastSaveResult}
            />
          </>
        ) : (
          <MessagesTab />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  discoverButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 24,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  discoverButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  discoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  discoverHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  discoverHeaderText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
