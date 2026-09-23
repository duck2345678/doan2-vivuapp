import { ReportModal } from "@/components/ReportModal";
import { ReportSuccessModal } from "@/components/ReportSuccessModal";
import { SaveSuccessModal } from "@/components/SaveSuccessModal";
import { PostCard } from "@/features/community/components/PostCard";
import { PostOwnerMenu } from "@/features/community/components/PostOwnerMenu";
import {
  useBlockPost,
  useReportPost,
  useSavePost,
} from "@/features/community/hooks";
import { useReportedPostsStore } from "@/features/community/services/reportedPostsStore";
import type { PostLocation, PostVisibility } from "@/features/community/types";
import { useDeletePost, useUpdatePost } from "@/features/post/hooks";
import { PostLocationDetailSheet } from "@/shared/components/post";
import { Colors, Spacing } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { PostType, Visibility } from "@/shared/types/backend.types";
import { showErrorToast } from "@/shared/utils";
import { Href, router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { s, vs } from "react-native-size-matters";
import {
  mapProfilePostToCommunityPost,
  useMyPosts,
  useMyProfile,
  useProfileLikePost,
  useProfileShareSheet,
} from "../hooks";
import type { ProfilePost } from "../types";
import { ProfileActionButtons } from "./ProfileActionButtons";
import { ProfileEmptyPostCard } from "./ProfileEmptyPostCard";
import { ProfileHeaderIcons } from "./ProfileHeaderIcons";
import { ProfileInfo } from "./ProfileInfo";
import { ProfileShareSheet } from "./ProfileShareSheet";
import { ProfileTabKey, ProfileTabs } from "./ProfileTabs";
import { ProfileUnsaveMenu } from "./ProfileUnsaveMenu";

export function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<ProfileTabKey>("my-posts");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [isEditPrivacyOpen, setIsEditPrivacyOpen] = useState(false);
  const [selectedPostVisibility, setSelectedPostVisibility] =
    useState<PostVisibility>("public");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [lastSaveResult, setLastSaveResult] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReportSuccessModalOpen, setIsReportSuccessModalOpen] =
    useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PostLocation | null>(
    null,
  );
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);

  // Fetch current user's profile
  const { profile, isLoading: isProfileLoading } = useMyProfile();

  // Fetch user's posts based on active tab
  const {
    data: posts = [],
    isLoading: isPostsLoading,
    refetch: refetchPosts,
  } = useMyPosts(activeTab);

  // Refetch posts when screen is focused (e.g., after editing a post)
  useFocusEffect(
    useCallback(() => {
      refetchPosts();
    }, [refetchPosts]),
  );

  // Mutations
  const { mutate: savePost } = useSavePost();
  const { mutate: deletePost } = useDeletePost();
  const { mutate: updatePost } = useUpdatePost();
  const { mutate: likePost } = useProfileLikePost();
  const { mutate: reportPost } = useReportPost();
  const { mutate: blockPost } = useBlockPost();
  const addReportedPost = useReportedPostsStore(
    (state) => state.addReportedPost,
  );

  // Profile share sheet
  const shareSheet = useProfileShareSheet({
    userId: profile?.id,
    displayName: profile?.displayName,
  });

  // Handlers
  const handleAnalyticsPress = () => {
    console.log("Analytics pressed");
  };

  const handleSearchPress = () => {
    console.log("Search pressed");
  };

  const handleSettingsPress = () => {
    router.push("/settings" as Href);
  };

  const handleEditProfilePress = () => {
    router.push("/profile/edit");
  };

  const handleShareProfilePress = () => {
    if (!profile) return;
    shareSheet.open();
  };

  const handleCreatePost = () => {
    router.push("/post/create" as Href);
  };

  const handleMenuPress = useCallback(
    (postId: string) => {
      setSelectedPostId(postId);

      // If in favorites tab, show unsave menu
      if (activeTab === "favorites") {
        setIsMenuOpen(true);
        return;
      }

      // If in my-posts tab, show owner menu for own posts
      const post = posts.find((p) => p.id === postId);
      if (post) {
        setIsOwnerMenuOpen(true);
      }
    },
    [posts, activeTab],
  );

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
    setIsOwnerMenuOpen(false);
    setSelectedPostId(null);
  }, []);

  // Menu action handlers
  const handleSavePost = useCallback(
    (postId: string) => {
      savePost(postId, {
        onSuccess: () => {
          setLastSaveResult(true);
          setIsSaveModalOpen(true);
        },
        onError: () => {
          showErrorToast("Không thể lưu bài viết");
        },
      });
    },
    [savePost],
  );

  const handleUnsavePost = useCallback(
    (postId: string) => {
      savePost(postId, {
        onSuccess: () => {
          setLastSaveResult(false);
          setIsSaveModalOpen(true);
          refetchPosts();
        },
        onError: () => {
          showErrorToast("Không thể bỏ lưu bài viết");
        },
      });
    },
    [savePost, refetchPosts],
  );

  const handleEditPost = useCallback(
    (postId: string) => {
      router.push({ pathname: "/post/edit", params: { postId } } as any);
    },
    [router],
  );

  const handleEditPrivacy = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (post) {
        const visibility: PostVisibility =
          post.visibility === "PUBLIC"
            ? "public"
            : post.visibility === "PRIVATE"
              ? "private"
              : "friends";
        setSelectedPostVisibility(visibility);
        setSelectedPostId(postId);
        setIsEditPrivacyOpen(true);
      }
    },
    [posts],
  );

  const handleCloseEditPrivacy = useCallback(() => {
    setIsEditPrivacyOpen(false);
  }, []);

  const handleUpdateVisibility = useCallback(
    (postId: string, visibility: PostVisibility) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const backendVisibility =
        visibility === "public"
          ? Visibility.PUBLIC
          : visibility === "private"
            ? Visibility.PRIVATE
            : Visibility.FRIENDS;

      updatePost(
        {
          postId: Number(postId),
          data: {
            postType: PostType.EXPERIENCE,
            visibility: backendVisibility,
          },
        },
        {
          onSuccess: () => {
            setIsEditPrivacyOpen(false);
          },
          onError: () => {
            showErrorToast("Không thể cập nhật quyền riêng tư");
          },
        },
      );
    },
    [posts, updatePost],
  );

  const handleLikePost = useCallback(
    (postId: string) => {
      likePost(postId, {
        onError: () => {
          showErrorToast("Không thể thích bài viết");
        },
      });
    },
    [likePost],
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

  const handleCloseLocationSheet = useCallback(() => {
    setIsLocationSheetOpen(false);
    setSelectedLocation(null);
  }, []);

  const handleAvatarPress = useCallback(
    (authorId: string) => {
      if (authorId && authorId !== String(profile?.userId)) {
        router.push(`/profile/${authorId}` as any);
      }
    },
    [router, profile?.userId],
  );

  const handleReportPost = useCallback((postId: string) => {
    setReportTargetId(postId);
    setIsReportModalOpen(true);
    setIsMenuOpen(false);
  }, []);

  const handleSubmitReport = useCallback(
    (reason: string) => {
      if (reportTargetId) {
        reportPost(
          { postId: reportTargetId, reason },
          {
            onSuccess: () => {
              setIsReportModalOpen(false);
              setIsReportSuccessModalOpen(true);
              addReportedPost(reportTargetId);
              refetchPosts();
            },
            onError: () => {
              setIsReportModalOpen(false);
              setReportTargetId(null);
            },
          },
        );
      }
    },
    [reportTargetId, reportPost, addReportedPost, refetchPosts],
  );

  const handleBlockPost = useCallback(
    (postId: string) => {
      blockPost(postId, {
        onSuccess: () => {
          setIsMenuOpen(false);
          refetchPosts();
        },
      });
    },
    [blockPost, refetchPosts],
  );

  const handleMoveToTrash = useCallback(
    (postId: string) => {
      Alert.alert(
        "Xóa bài viết",
        "Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa",
            style: "destructive",
            onPress: () => {
              deletePost(Number(postId), {
                onSuccess: () => {
                  refetchPosts();
                },
                onError: () => {
                  showErrorToast("Không thể xóa bài viết");
                },
              });
            },
          },
        ],
      );
    },
    [deletePost, refetchPosts],
  );

  const renderPostItem = useCallback(
    ({ item }: { item: ProfilePost }) => {
      const communityPost = mapProfilePostToCommunityPost(item);
      return (
        <PostCard
          post={communityPost}
          onMenuPress={handleMenuPress}
          onLikePress={handleLikePost}
          onCommentPress={handleCommentPress}
          onLocationPress={handleLocationPress}
          onAvatarPress={handleAvatarPress}
        />
      );
    },
    [
      handleMenuPress,
      handleLikePost,
      handleCommentPress,
      handleLocationPress,
      handleAvatarPress,
    ],
  );

  const keyExtractor = useCallback((item: ProfilePost) => item.id, []);

  // Loading state
  if (isProfileLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  const ListHeaderComponent = (
    <View>
      {/* Profile Info Section */}
      {profile && <ProfileInfo profile={profile} style={styles.profileInfo} />}

      <ProfileActionButtons
        onEditPress={handleEditProfilePress}
        onSharePress={handleShareProfilePress}
      />

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );

  const ListEmptyComponent = isPostsLoading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  ) : (
    <ProfileEmptyPostCard onCreatePost={handleCreatePost} />
  );

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.content}>
          <ProfileHeaderIcons
            onAnalyticsPress={handleAnalyticsPress}
            onSearchPress={handleSearchPress}
            onSettingsPress={handleSettingsPress}
          />

          <FlatList
            data={posts}
            renderItem={renderPostItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={ListEmptyComponent}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Profile Share Bottom Sheet */}
          {profile && (
            <ProfileShareSheet
              ref={shareSheet.bottomSheetRef}
              userId={profile.id}
              displayName={profile.displayName}
              qrViewRef={shareSheet.qrViewRef}
              onCopyLink={shareSheet.handleCopyLink}
              onShare={shareSheet.handleShare}
              onDownload={shareSheet.handleDownload}
              onScan={shareSheet.handleScan}
            />
          )}

          {/* Post Owner Menu - for my posts */}
          <PostOwnerMenu
            isOpen={isOwnerMenuOpen}
            onClose={handleCloseMenu}
            postId={selectedPostId ?? ""}
            onSave={handleSavePost}
            onEditPost={handleEditPost}
            onMoveToTrash={handleMoveToTrash}
          />

          {/* Unsave Menu - for favorites tab */}
          <ProfileUnsaveMenu
            isOpen={isMenuOpen}
            onClose={handleCloseMenu}
            postId={selectedPostId ?? ""}
            onUnsave={handleUnsavePost}
          />

          {/* Location Detail Sheet */}
          <PostLocationDetailSheet
            isOpen={isLocationSheetOpen}
            location={selectedLocation}
            onClose={handleCloseLocationSheet}
          />

          {/* Report Modal */}
          <ReportModal
            visible={isReportModalOpen}
            onClose={() => {
              setIsReportModalOpen(false);
              setReportTargetId(null);
            }}
            onSubmit={handleSubmitReport}
            targetType="post"
          />

          {/* Report Success Modal */}
          <ReportSuccessModal
            visible={isReportSuccessModalOpen}
            onClose={() => setIsReportSuccessModalOpen(false)}
            targetType="post"
          />

          {/* Save Success Modal */}
          <SaveSuccessModal
            visible={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            isSaved={lastSaveResult}
          />
        </View>
      </SafeAreaView>
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
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  profileInfo: {
    paddingHorizontal: s(16),
    paddingTop: vs(20),
    paddingBottom: vs(8),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: vs(40),
  },
});
