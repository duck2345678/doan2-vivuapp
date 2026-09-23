/**
 * ProfilePostCard Component
 */
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ItineraryShareData } from "@/features/itinerary/types/itinerary.types";
import { Avatar } from "@/shared/components/ui";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";

import type { ProfilePost } from "../types";

// Parse embedded itinerary data from content if present
const parseEmbeddedItinerary = (content: string) => {
  const match = content.match(
    /\[ITINERARY_SHARE\](.*?)\[\/ITINERARY_SHARE\]/s,
  );
  if (match) {
    try {
      const tripData = JSON.parse(match[1]);
      const cleanContent = content
        .replace(/\n*\[ITINERARY_SHARE\].*?\[\/ITINERARY_SHARE\]/s, "")
        .trim();
      // Convert to ItineraryShareData format with all required fields
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
          thumbnail: stop.thumbnail || stop.placeImageUrl || stop.imageUrl,
        })),
        // Store original trip data for "Sử dụng chuyến đi"
        originalTripData: tripData,
      };
      return { cleanContent, itineraryShare };
    } catch (e) {
      return { cleanContent: content, itineraryShare: null };
    }
  }
  return { cleanContent: content, itineraryShare: null };
};

const getVisibilityIcon = (visibility?: string) => {
  if (!visibility) return null;
  switch (visibility.toUpperCase()) {
    case "PUBLIC":
      return { name: "earth", color: "#10b981" }; // green
    case "PRIVATE":
      return { name: "lock-closed", color: "#f59e0b" }; // amber
    case "FRIENDS":
      return { name: "people", color: "#3b82f6" }; // blue
    default:
      return null;
  }
};

interface ProfilePostCardProps {
  post: ProfilePost;
  onMenuPress?: (postId: string) => void;
  onLikePress?: (postId: string) => void;
  onCommentPress?: (postId: string) => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ngày trước`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} tuần trước`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} tháng trước`;

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} năm trước`;
}

export function ProfilePostCard({
  post,
  onMenuPress,
  onLikePress,
  onCommentPress,
}: ProfilePostCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  // Early return if post data is invalid
  if (!post || !post.reactions) {
    return null;
  }

  // Parse embedded itinerary from content
  const { cleanContent, itineraryShare } = parseEmbeddedItinerary(post.content || "");

  const likeIcon = post.reactions.isLiked ? "heart" : "heart-outline";
  const likeColor = post.reactions.isLiked
    ? colors.heartLiked
    : colors.textSecondary;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
        Shadows.sm,
      ]}
    >
      <View style={styles.header}>
        <Avatar
          size="md"
          source={post.author.avatarUrl}
          name={post.author.name}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.authorName, { color: colors.textPrimary }]}>
            {post.author.name}
          </Text>
          <View style={styles.timeRow}>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {formatTimeAgo(post.createdAt)}
            </Text>
            {post.visibility &&
              (() => {
                const icon = getVisibilityIcon(post.visibility);
                return icon ? (
                  <>
                    <Text style={[styles.dot, { color: colors.textSecondary }]}>
                      •
                    </Text>
                    <Ionicons
                      name={icon.name as any}
                      size={12}
                      color={icon.color}
                      style={styles.visibilityIcon}
                    />
                  </>
                ) : null;
              })()}
          </View>
        </View>
        <Pressable
          style={styles.menuButton}
          onPress={() => onMenuPress?.(post.id)}
          accessibilityLabel="Tùy chọn bài viết"
          accessibilityRole="button"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Display clean content (without ITINERARY_SHARE marker) */}
      {cleanContent && (
        <Text style={[styles.content, { color: colors.textPrimary }]}>
          {cleanContent}
        </Text>
      )}

      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.media}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      {/* Display Itinerary Share Card if present */}
      {itineraryShare && (
        <View style={{ marginHorizontal: Spacing.cardPadding, marginTop: Spacing.sm }}>
          <ItineraryShareCard itinerary={itineraryShare} />
        </View>
      )}

      {post.locations.length > 0 && (
        <View style={styles.locations}>
          {post.locations.map((location) => (
            <View
              key={location.id}
              style={[
                styles.locationChip,
                {
                  backgroundColor: colors.locationChipGradientStart,
                  borderColor: colors.locationChipBorder,
                },
              ]}
            >
              <Ionicons
                name="location"
                size={14}
                color={colors.locationChipText}
              />
              <Text
                style={[
                  styles.locationText,
                  { color: colors.locationChipText },
                ]}
              >
                {location.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.reactions}>
        <Pressable
          style={styles.reactionItem}
          onPress={() => onLikePress?.(post.id)}
          accessibilityRole="button"
          accessibilityLabel="Thích bài viết"
        >
          <Ionicons name={likeIcon} size={18} color={likeColor} />
          <Text style={[styles.reactionText, { color: colors.textSecondary }]}>
            {post.reactions.likes}
          </Text>
        </Pressable>
        <Pressable
          style={styles.reactionItem}
          onPress={() => onCommentPress?.(post.id)}
          accessibilityRole="button"
          accessibilityLabel="Bình luận"
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.reactionText, { color: colors.textSecondary }]}>
            {post.reactions.comments}
          </Text>
        </Pressable>
        {typeof post.reactions.shares === "number" && (
          <View style={styles.reactionItem}>
            <Ionicons
              name="paper-plane-outline"
              size={18}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.reactionText, { color: colors.textSecondary }]}
            >
              {post.reactions.shares}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.cardPadding,
    paddingTop: Spacing.cardPadding,
    gap: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  authorName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    lineHeight: 24,
  },
  time: {
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  dot: {
    fontSize: Typography.sizes.sm,
    marginHorizontal: 2,
  },
  visibilityIcon: {
    marginLeft: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Spacing.cardPadding,
    paddingTop: Spacing.sm,
    fontSize: Typography.sizes.base,
    lineHeight: 24,
  },
  media: {
    width: "100%",
    height: 200,
    marginTop: Spacing.sm,
  },
  locations: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.cardPadding,
    paddingTop: Spacing.sm,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  locationText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  reactions: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: Spacing.md,
  },
  reactionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reactionText: {
    fontSize: Typography.sizes.sm,
  },
});
