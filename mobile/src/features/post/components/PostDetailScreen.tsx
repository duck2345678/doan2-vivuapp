/**
 * PostDetailScreen Component
 * Main screen displaying post detail with comments
 */

import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth";
import { useMyProfile } from "@/features/profile";
import { LoadingScreen } from "@/shared/components/feedback";
import { Colors, Shadows, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import {
  useCreateComment,
  useDeletePost,
  usePostComments,
  usePostDetail,
  useReportComment,
  useUpdatePost,
} from "../hooks";
import { useLikeComment, useLikePost } from "../hooks/useReactions";
import type { CommentRequest, PostLocation, PostVisibility } from "../types";
import { sharePost } from "../utils";

import { ReportModal } from "@/components/ReportModal";
import { ReportSuccessModal } from "@/components/ReportSuccessModal";
import { EditPrivacySheet } from "@/features/community/components/EditPrivacySheet";
import { PostOverflowMenu } from "@/features/community/components/PostOverflowMenu";
import { PostOwnerMenu } from "@/features/community/components/PostOwnerMenu";
import {
  useBlockPost,
  useReportPost,
  useSavePost,
} from "@/features/community/hooks";
import { ItineraryShareCard } from "@/features/itinerary/components/ItineraryShareCard";
import type { ItineraryShareData } from "@/features/itinerary/types/itinerary.types";
import {
  PostActionRow,
  PostLocationDetailSheet,
} from "@/shared/components/post";
import { PostType, Visibility } from "@/shared/types/backend.types";
import { mapCommentResponseToComment } from "../adapters/commentAdapter";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { CommentListHeader } from "./CommentListHeader";
import { PostAuthorRow } from "./PostAuthorRow";
import { PostDetailHeader } from "./PostDetailHeader";
import { PostDetailMedia } from "./PostDetailMedia";
import { PostLocationChips } from "./PostLocationChips";

interface PostDetailScreenProps {
  postId: string;
}

export function PostDetailScreen({ postId }: PostDetailScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const { profile: myProfile } = useMyProfile();
  const currentUserId = currentUser?.id ?? myProfile?.userId;

  // State
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [isEditPrivacyOpen, setIsEditPrivacyOpen] = useState(false);
  const [selectedPostVisibility, setSelectedPostVisibility] =
    useState<PostVisibility>("public");
  const [selectedLocation, setSelectedLocation] = useState<PostLocation | null>(
    null,
  );
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReportSuccessModalOpen, setIsReportSuccessModalOpen] =
    useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportTargetType, setReportTargetType] = useState<"post" | "comment">(
    "post",
  );

  // Queries & mutations - disable all fetching when post is deleted
  const {
    data: post,
    isLoading: isPostLoading,
    refetch: refetchPost,
  } = usePostDetail(isDeleted ? undefined : postId);
  const {
    data: commentsData,
    isLoading: isCommentsLoading,
    fetchNextPage,
    hasNextPage,
    refetch: refetchComments,
  } = usePostComments(isDeleted ? undefined : postId);

  const togglePostLikeMutation = useLikePost();
  const createCommentMutation = useCreateComment();
  const toggleCommentLikeMutation = useLikeComment();
  const { mutate: updatePost, isPending: isUpdatingPost } = useUpdatePost();
  const { mutate: deletePost, isPending: isDeletingPost } = useDeletePost();
  const { mutate: savePost, isPending: isSavingPost } = useSavePost();
  const { mutate: reportPost, isPending: isReportingPost } = useReportPost();
  const { mutate: reportComment, isPending: isReportingComment } =
    useReportComment();
  const { mutate: blockPost, isPending: isBlockingPost } = useBlockPost();

  const isPostOwner = useMemo(() => {
    if (!post?.authorId || !currentUserId) return false;
    return String(post.authorId) === String(currentUserId);
  }, [post?.authorId, currentUserId]);

  // Parse embedded itinerary from content
  const parseEmbeddedItinerary = useCallback((content: string) => {
    const match = content.match(
      /\[ITINERARY_SHARE\](.*?)\[\/ITINERARY_SHARE\]/s,
    );
    if (match) {
      try {
        const tripData = JSON.parse(match[1]);
        const cleanContent = content
          .replace(/\n*\[ITINERARY_SHARE\].*?\[\/ITINERARY_SHARE\]/s, "")
          .trim();
        const itineraryShare: ItineraryShareData = {
          id: tripData.id || String(Date.now()),
          dayLabel: tripData.title || "Lịch trình",
          date: tripData.date,
          stopsCount: tripData.stopsCount || tripData.stops?.length || 0,
          timeRange: tripData.timeRange || "",
          tags: ["Lịch trình"],
          stops: (tripData.stops || []).map((stop: any, index: number) => ({
            id: stop.id || String(index),
            time: stop.time || "",
            name: stop.name,
            address: tripData.area || "TP.HCM",
            order: index + 1,
          })),
          originalTripData: tripData,
        };
        return { cleanContent, itineraryShare };
      } catch (e) {
        return { cleanContent: content, itineraryShare: null };
      }
    }
    return { cleanContent: content, itineraryShare: null };
  }, []);

  // Parsed content and itinerary
  const { cleanContent: parsedContent, itineraryShare: embeddedItinerary } =
    useMemo(() => {
      if (!post?.content) return { cleanContent: "", itineraryShare: null };
      return parseEmbeddedItinerary(post.content);
    }, [post?.content, parseEmbeddedItinerary]);

  // Handler for opening shared itinerary
  const handleOpenItinerary = useCallback(
    (itinerary: ItineraryShareData) => {
      // Build destinations from stops
      const buildDestinations = () => {
        if (!itinerary.stops || itinerary.stops.length === 0) return [];
        return itinerary.stops.map((stop, index) => ({
          id: stop.id || String(index + 1),
          name: stop.name || "Địa điểm",
          time: stop.time,
          address: stop.address,
          thumbnail: stop.thumbnail,
          order: index + 1,
        }));
      };

      // Normalize originalTripData or build from scratch
      let tripData;
      if (itinerary.originalTripData) {
        const original = itinerary.originalTripData;
        // Ensure destinations exists - prefer destinations, fallback to stops
        tripData = {
          ...original,
          id: original.id || itinerary.id,
          tripName:
            original.tripName || original.tourName || itinerary.dayLabel,
          startDate: original.startDate || new Date().toISOString(),
          startTime: original.startTime || new Date().toISOString(),
          destinations:
            original.destinations ||
            (original.stops
              ? original.stops.map((stop: any, index: number) => ({
                  id: stop.id?.toString() || String(index + 1),
                  name: stop.placeName || stop.name || "Địa điểm",
                  thumbnail:
                    stop.placeImageUrl || stop.imageUrl || stop.thumbnail,
                  time: stop.visitTime || stop.time,
                  address: stop.address,
                  order: stop.order || index + 1,
                }))
              : buildDestinations()),
          area: original.area || "TP.HCM",
        };
      } else {
        tripData = {
          id: itinerary.id,
          tripName: itinerary.dayLabel,
          startDate: new Date().toISOString(),
          startTime: new Date().toISOString(),
          destinations: buildDestinations(),
          area: "TP.HCM",
        };
      }

      router.push({
        pathname: "/(modals)/shared-itinerary",
        params: { tripData: JSON.stringify(tripData) },
      });
    },
    [router],
  );

  // Flatten comments for FlatList - MUST be before any early returns to follow React hooks rules
  const flattenedComments = useMemo(
    () => commentsData?.pages.flatMap((page) => page.content) || [],
    [commentsData?.pages],
  );
  const uiComments = useMemo(
    () => flattenedComments.map(mapCommentResponseToComment),
    [flattenedComments],
  );

  // Handlers
  const handleLikePress = useCallback(() => {
    if (post?.id) {
      togglePostLikeMutation.mutate(post.id);
    }
  }, [togglePostLikeMutation, post?.id]);

  const handleMenuPress = useCallback(() => {
    if (!post) return;
    if (isPostOwner) {
      setSelectedPostVisibility(
        post.visibility === Visibility.PUBLIC ? "public" : "private",
      );
      setIsOwnerMenuOpen(true);
    } else {
      setIsMenuOpen(true);
    }
  }, [post, isPostOwner]);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
    setIsOwnerMenuOpen(false);
  }, []);

  const handleCommentPress = useCallback(() => {
    // Scroll to comments section
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleSharePress = useCallback(() => {
    if (post) {
      sharePost(post, (error) => {
        console.error("Share failed:", error);
      });
    }
  }, [post]);

  const handleLocationPress = useCallback((location: PostLocation) => {
    setSelectedLocation(location);
    setIsLocationSheetOpen(true);
  }, []);

  const handleCloseLocationSheet = useCallback(() => {
    setIsLocationSheetOpen(false);
    setSelectedLocation(null);
  }, []);

  const handleCommentLike = useCallback(
    (commentId: number) => {
      if (post?.id) {
        toggleCommentLikeMutation.mutate({ commentId, postId: post.id });
      }
    },
    [toggleCommentLikeMutation, post?.id],
  );

  const handleReplyPress = useCallback((commentId: string) => {
    setReplyingToId(commentId);
  }, []);

  const handleSavePost = useCallback(
    (postIdOverride?: string) => {
      const targetPostId =
        postIdOverride ?? (post?.id ? String(post.id) : undefined);
      if (!targetPostId || isSavingPost) return;
      savePost(targetPostId);
    },
    [post?.id, savePost, isSavingPost],
  );

  const handleReportPost = useCallback(
    (postIdOverride?: string) => {
      const targetPostId =
        postIdOverride ?? (post?.id ? String(post.id) : undefined);
      if (!targetPostId) return;
      setReportTargetId(targetPostId);
      setReportTargetType("post");
      setIsReportModalOpen(true);
      setIsMenuOpen(false);
    },
    [post?.id],
  );

  const handleReportComment = useCallback((commentId: string) => {
    setReportTargetId(commentId);
    setReportTargetType("comment");
    setIsReportModalOpen(true);
  }, []);

  const handleSubmitReport = useCallback(
    (reason: string) => {
      if (!reportTargetId) return;

      if (reportTargetType === "post") {
        if (!isReportingPost) {
          reportPost(
            { postId: reportTargetId, reason },
            {
              onSuccess: () => {
                setIsReportModalOpen(false);
                setIsReportSuccessModalOpen(true);
                // Navigate back after showing success modal for post reports
                setTimeout(() => {
                  setIsDeleted(true);
                  router.back();
                }, 2000);
              },
              onError: () => {
                setIsReportModalOpen(false);
                setReportTargetId(null);
              },
            },
          );
        }
      } else {
        if (!isReportingComment) {
          reportComment(
            { commentId: Number(reportTargetId), reason },
            {
              onSuccess: () => {
                setIsReportModalOpen(false);
                setIsReportSuccessModalOpen(true);
                // Refresh comments to remove the reported one
                refetchComments();
              },
              onError: () => {
                setIsReportModalOpen(false);
                setReportTargetId(null);
              },
            },
          );
        }
      }
    },
    [
      reportTargetId,
      reportTargetType,
      reportPost,
      reportComment,
      isReportingPost,
      isReportingComment,
    ],
  );

  const handleBlockPost = useCallback(
    (postIdOverride?: string) => {
      const targetPostId =
        postIdOverride ?? (post?.id ? String(post.id) : undefined);
      if (!targetPostId || isBlockingPost) return;
      blockPost(targetPostId);
    },
    [post?.id, blockPost, isBlockingPost],
  );

  const handleEditPrivacy = useCallback(() => {
    if (!post) return;
    setSelectedPostVisibility(
      post.visibility === Visibility.PUBLIC ? "public" : "private",
    );
    setIsEditPrivacyOpen(true);
  }, [post]);

  const handleCloseEditPrivacy = useCallback(() => {
    setIsEditPrivacyOpen(false);
  }, []);

  const handleEditPost = useCallback(() => {
    if (!post?.id) return;
    router.push({
      pathname: "/post/edit",
      params: { postId: String(post.id) },
    } as any);
  }, [post?.id, router]);

  const handleMoveToTrash = useCallback(() => {
    if (!post?.id || isDeletingPost) return;
    Alert.alert(
      "Xóa bài viết",
      "Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            if (!post.id) return;
            deletePost(post.id, {
              onSuccess: () => {
                // Set isDeleted immediately to disable all queries and prevent 404 errors
                setIsDeleted(true);
                router.back();
              },
            });
          },
        },
      ],
    );
  }, [post?.id, deletePost, isDeletingPost, router]);

  const handleUpdateVisibility = useCallback(
    (visibility: PostVisibility) => {
      if (!post?.id || isUpdatingPost) return;
      updatePost({
        postId: post.id,
        data: {
          postType: post.postType ?? PostType.EXPERIENCE,
          visibility:
            visibility === "public" ? Visibility.PUBLIC : Visibility.PRIVATE,
        },
      });
    },
    [post?.id, post?.postType, updatePost, isUpdatingPost],
  );

  const handleSubmitComment = useCallback(
    (content: string) => {
      if (!post?.id) return;

      const commentRequest: CommentRequest = {
        postId: post.id,
        content,
        // Ensure parentCommentId is a number if your API expects number
        // If replyingToId is string (from UI), parse it.
        parentCommentId: replyingToId ? parseInt(replyingToId, 10) : undefined,
      };

      createCommentMutation.mutate(commentRequest, {
        onSuccess: () => {
          setReplyingToId(null);
        },
      });
    },
    [createCommentMutation, replyingToId, post?.id],
  );

  const handleCancelReply = useCallback(() => {
    setReplyingToId(null);
  }, []);

  // Return null immediately if post was deleted to prevent rendering with stale data
  if (isDeleted) {
    return null;
  }

  // Render loading state
  if (isPostLoading || !post) {
    return <LoadingScreen message="Đang tải bài viết..." />;
  }

  // Count total comments using post stats when available
  const totalComments = post.commentCount ?? flattenedComments.length;

  const renderComment = ({
    item,
  }: {
    item: ReturnType<typeof mapCommentResponseToComment>;
  }) => (
    <CommentItem
      comment={item}
      onLikePress={(id) => handleCommentLike(parseInt(id, 10))}
      onReplyPress={handleReplyPress}
      onReportPress={handleReportComment}
    />
  );

  const ListHeader = () => (
    <>
      {/* Post Card */}
      <View
        style={[
          styles.postCard,
          { backgroundColor: colors.card, ...Shadows.sm },
        ]}
      >
        {/* Author row */}
        <PostAuthorRow
          authorId={post.authorId}
          authorName={post.authorName}
          authorAvatarUrl={post.authorAvatarUrl}
          createdAt={post.createdAt}
          visibility={
            post.visibility === Visibility.PUBLIC ? "public" : "private"
          }
          onMenuPress={handleMenuPress}
        />

        {/* Content */}
        {parsedContent.length > 0 && (
          <View style={styles.contentContainer}>
            <Text style={[styles.content, { color: colors.text }]}>
              {parsedContent}
            </Text>
          </View>
        )}

        {/* Embedded Itinerary Card */}
        {embeddedItinerary && (
          <ItineraryShareCard
            itinerary={embeddedItinerary}
            onPress={() => handleOpenItinerary(embeddedItinerary)}
          />
        )}

        {/* Media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <PostDetailMedia mediaUrls={post.mediaUrls} />
        )}

        {/* Location chips */}
        {post.locations && post.locations.length > 0 && (
          <PostLocationChips
            locations={post.locations as PostLocation[]}
            onLocationPress={handleLocationPress}
          />
        )}

        {/* Action row with stats */}
        <PostActionRow
          variant="full"
          isLiked={post.isLiked ?? false}
          onLikePress={handleLikePress}
          onCommentPress={handleCommentPress}
          onSharePress={handleSharePress}
          likesCount={post.reactionCount ?? 0}
          commentsCount={post.commentCount ?? 0}
          sharesCount={0} // Placeholder
        />
      </View>

      {/* Comments section header */}
      <View style={[styles.commentsSection, { backgroundColor: colors.card }]}>
        <CommentListHeader totalComments={totalComments} />
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      {/* Header */}
      <PostDetailHeader />

      {/* Main content */}
      <FlatList
        ref={flatListRef}
        data={uiComments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id || Math.random().toString()}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={<View style={styles.listFooter} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isPostLoading}
            onRefresh={() => {
              refetchPost();
              refetchComments();
            }}
            tintColor={colors.tint}
          />
        }
        style={{ backgroundColor: colors.card }}
      />

      {/* Comment composer */}
      <CommentComposer
        onSubmit={handleSubmitComment}
        isSubmitting={createCommentMutation.isPending}
        replyingTo={replyingToId}
        onCancelReply={handleCancelReply}
      />

      <PostOverflowMenu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        postId={post?.id ? String(post.id) : ""}
        onSave={(postId) => handleSavePost(postId)}
        onReport={(postId) => handleReportPost(postId)}
        onBlock={(postId) => handleBlockPost(postId)}
      />

      <PostOwnerMenu
        isOpen={isOwnerMenuOpen}
        onClose={handleMenuClose}
        postId={post?.id ? String(post.id) : ""}
        onSave={(postId) => handleSavePost(postId)}
        onEditPrivacy={() => handleEditPrivacy()}
        onEditPost={() => handleEditPost()}
        onMoveToTrash={() => handleMoveToTrash()}
      />

      <EditPrivacySheet
        isOpen={isEditPrivacyOpen}
        onClose={handleCloseEditPrivacy}
        postId={post?.id ? String(post.id) : ""}
        currentVisibility={selectedPostVisibility}
        onSave={(_, visibility) => handleUpdateVisibility(visibility)}
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
        targetType={reportTargetType}
        isLoading={
          reportTargetType === "post" ? isReportingPost : isReportingComment
        }
      />

      <ReportSuccessModal
        visible={isReportSuccessModalOpen}
        onClose={() => {
          setIsReportSuccessModalOpen(false);
          setReportTargetId(null);
        }}
        targetType={reportTargetType}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  postCard: {
    marginBottom: Spacing.sm,
  },
  contentContainer: {
    paddingHorizontal: Spacing.cardPadding - 4, // 12px
    paddingTop: Spacing.sm,
  },
  content: {
    fontSize: Typography.sizes.md, // 14px
    fontWeight: Typography.weights.normal,
    lineHeight: 22.75,
  },
  commentsSection: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  listFooter: {
    height: Spacing.lg, // 24px bottom padding
  },
});
