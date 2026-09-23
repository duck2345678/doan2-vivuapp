import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ItineraryShareCard } from "@/features/itinerary/components/ItineraryShareCard";
import { ChannelInviteCard } from "@/shared/components/channel";
import { PostActionRow } from "@/shared/components/post";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import type { CommunityPost, PostLocation } from "../types";
import { PostHeader } from "./PostHeader";
import { PostLocations } from "./PostLocations";
import { PostMedia } from "./PostMedia";

interface PostCardProps {
  post: CommunityPost;
  onMenuPress: (postId: string) => void;
  onLikePress: (postId: string) => void;
  onCommentPress: (postId: string) => void;
  onSharePress?: (postId: string) => void;
  onLocationPress?: (location: PostLocation) => void;
  onPress?: (postId: string) => void;
  onAvatarPress?: (authorId: string) => void;
  /** Called when user taps on itinerary card - navigate to SharedItineraryDetailScreen */
  onOpenItinerary?: (itinerary: any) => void;
}

function TagChips({
  tags,
  colors,
}: {
  tags: string[];
  colors: { actionBlue: string };
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <View style={tagStyles.container}>
      <Text style={[tagStyles.text, { color: colors.actionBlue }]}>
        {tags.join(" • ")}
      </Text>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.cardPadding,
    paddingTop: Spacing.sm,
  },
  text: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});

export function PostCard({
  post,
  onMenuPress,
  onLikePress,
  onCommentPress,
  onSharePress,
  onLocationPress,
  onPress,
  onAvatarPress,
  onOpenItinerary,
}: PostCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

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
        const itineraryShare = {
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

  const { cleanContent, itineraryShare: embeddedItinerary } =
    parseEmbeddedItinerary(post.content || "");
  const itineraryToShow = post.itineraryShare || embeddedItinerary;
  const hasItinerary = !!itineraryToShow;

  const handleCardPress = () => {
    // Navigate to post detail when tapping on card
    if (onPress) {
      onPress(post.id);
    } else {
      onCommentPress(post.id);
    }
  };

  // Use View wrapper when has itinerary to allow nested TouchableOpacity to work
  const CardWrapper = hasItinerary ? View : TouchableOpacity;
  const wrapperProps = hasItinerary
    ? {}
    : {
        testID: "post-card",
        activeOpacity: 0.9,
        onPress: handleCardPress,
      };

  return (
    <CardWrapper
      {...wrapperProps}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          ...Shadows.sm,
        },
      ]}
    >
      {/* Make header area tappable to go to post detail */}
      <Pressable onPress={handleCardPress}>
        <PostHeader
          author={post.author}
          createdAt={post.createdAt}
          visibility={post.visibility}
          onMenuPress={() => onMenuPress(post.id)}
          onAvatarPress={() => onAvatarPress?.(post.author.id)}
        />

        {post.tags && post.tags.length > 0 && (
          <TagChips tags={post.tags} colors={colors} />
        )}

        {cleanContent.length > 0 && (
          <View style={styles.contentContainer}>
            <Text style={[styles.content, { color: colors.textPrimary }]}>
              {cleanContent}
            </Text>
          </View>
        )}
      </Pressable>

      {itineraryToShow && (
        <ItineraryShareCard
          itinerary={itineraryToShow}
          onPress={handleCardPress}
        />
      )}

      {post.channelInvite && <ChannelInviteCard invite={post.channelInvite} />}

      {post.imageUrl && <PostMedia imageUrl={post.imageUrl} />}

      <PostLocations
        locations={post.locations}
        onLocationPress={onLocationPress}
      />

      <PostActionRow
        variant="compact"
        showBorder={false}
        likesCount={post.likesCount}
        commentsCount={post.commentsCount}
        sharesCount={post.sharesCount}
        isLiked={post.isLiked}
        onLikePress={() => onLikePress(post.id)}
        onCommentPress={() => onCommentPress(post.id)}
        onSharePress={() => onSharePress?.(post.id)}
      />
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  contentContainer: {
    paddingHorizontal: Spacing.cardPadding,
    paddingTop: Spacing.sm,
  },
  content: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    lineHeight: 26,
  },
});
