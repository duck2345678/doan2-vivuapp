import { Image } from "expo-image";
import React, { useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Avatar, PostActionRow, PostMediaLightbox } from "@/shared/components";
import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { formatRelativeTime } from "@/shared/utils";
import type { FeedItem } from "../types";

interface FeedCardProps {
  item: FeedItem;
  onPress?: () => void;
  onLikePress?: () => void;
  onCommentPress?: () => void;
  onSharePress?: () => void;
  onUserPress?: () => void;
}

export function FeedCard({
  item,
  onPress,
  onLikePress,
  onCommentPress,
  onSharePress,
  onUserPress,
}: FeedCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const hasImages = item.imageUrls && item.imageUrls.length > 0;

  const handleUserPress = () => {
    console.log("FeedCard: handleUserPress called");
    if (onUserPress) {
      onUserPress();
    } else {
      console.log("FeedCard: No onUserPress handler provided!");
    }
  };

  const handleImagePress = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const renderImages = () => {
    if (!item.imageUrls || item.imageUrls.length === 0) return null;

    const count = item.imageUrls.length;

    if (count === 1) {
      return (
        <Pressable
          onPress={() => handleImagePress(0)}
          style={styles.singleImageContainer}
        >
          <Image
            source={{ uri: item.imageUrls[0] }}
            style={styles.singleImage}
            contentFit="cover"
            transition={200}
          />
        </Pressable>
      );
    }

    if (count === 2) {
      return (
        <View style={styles.gridContainer}>
          {item.imageUrls.map((url, index) => (
            <Pressable
              key={index}
              onPress={() => handleImagePress(index)}
              style={styles.halfImageContainer}
            >
              <Image
                source={{ uri: url }}
                style={styles.gridImage}
                contentFit="cover"
                transition={200}
              />
            </Pressable>
          ))}
        </View>
      );
    }

    // 3 or more images
    return (
      <View style={styles.gridContainer}>
        <Pressable
          onPress={() => handleImagePress(0)}
          style={styles.halfImageContainer}
        >
          <Image
            source={{ uri: item.imageUrls[0] }}
            style={styles.gridImage}
            contentFit="cover"
            transition={200}
          />
        </Pressable>
        <View style={styles.halfImageContainer}>
          <View style={styles.quarterImageContainer}>
            <Pressable onPress={() => handleImagePress(1)} style={styles.flex1}>
              <Image
                source={{ uri: item.imageUrls[1] }}
                style={styles.gridImage}
                contentFit="cover"
                transition={200}
              />
            </Pressable>
          </View>
          <View style={styles.quarterImageContainer}>
            <Pressable onPress={() => handleImagePress(2)} style={styles.flex1}>
              <Image
                source={{ uri: item.imageUrls[2] }}
                style={styles.gridImage}
                contentFit="cover"
                transition={200}
              />
              {count > 3 && (
                <View style={styles.moreOverlay}>
                  <Text style={styles.moreText}>+{count - 3}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleUserPress}
          activeOpacity={0.8}
          style={styles.userInfo}
        >
          <Avatar
            source={item.author.avatarUrl}
            name={item.author.displayName}
            size="md"
          />
          <View style={styles.userMeta}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {item.author.displayName}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {formatRelativeTime(item.createdAt)}
              </Text>
              {item.location && (
                <>
                  <Text style={[styles.dot, { color: colors.textSecondary }]}>
                    •
                  </Text>
                  <Text
                    style={[styles.location, { color: colors.textSecondary }]}
                  >
                    {item.location.name}
                  </Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content - Clickable to navigate to post detail */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={styles.content}>
          <Text style={[styles.contentText, { color: colors.textPrimary }]}>
            {item.content}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Images */}
      {hasImages && <View style={styles.mediaContainer}>{renderImages()}</View>}

      {/* Actions */}
      <PostActionRow
        isLiked={item.isLiked}
        likesCount={item.likesCount}
        commentsCount={item.commentsCount}
        onLikePress={onLikePress || (() => {})}
        onCommentPress={onCommentPress || (() => {})}
        onSharePress={onSharePress}
        variant="compact"
        showBorder={true}
      />

      {/* Lightbox */}
      {hasImages && (
        <PostMediaLightbox
          isOpen={isLightboxOpen}
          mediaUrls={item.imageUrls!}
          initialIndex={lightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userMeta: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  userName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timestamp: {
    fontSize: Typography.sizes.xs,
  },
  dot: {
    marginHorizontal: 4,
    fontSize: Typography.sizes.xs,
  },
  location: {
    fontSize: Typography.sizes.xs,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  contentText: {
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  mediaContainer: {
    marginBottom: Spacing.sm,
  },
  singleImageContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  singleImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  gridContainer: {
    flexDirection: "row",
    height: 250,
    gap: 2,
  },
  halfImageContainer: {
    flex: 1,
    gap: 2,
  },
  quarterImageContainer: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  gridImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreText: {
    color: "#fff",
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
});
