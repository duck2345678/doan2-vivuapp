/**
 * CommentItem Component
 * Single comment with bubble style, supports replies (nested)
 */

import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Avatar } from "@/shared/components/ui";
import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import type { Comment } from "../types";
import { formatTimeAgo } from "../utils/formatTime";

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  onLikePress?: (commentId: string) => void;
  onReplyPress?: (commentId: string) => void;
  onReportPress?: (commentId: string) => void;
}

export function CommentItem({
  comment,
  isReply = false,
  onLikePress,
  onReplyPress,
  onReportPress,
}: CommentItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const bubbleColor = isReply
    ? colors.commentBubbleReply
    : colors.commentBubble;
  const avatarSize = isReply ? 28 : 36;

  const handleAvatarPress = useCallback(() => {
    if (comment.author.id) {
      router.push(`/profile/${comment.author.id}`);
    }
  }, [comment.author.id]);

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      {/* Avatar */}
      <Avatar
        size={isReply ? "sm" : "md"}
        source={comment.author.avatarUrl}
        name={comment.author.displayName}
        onPress={handleAvatarPress}
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
      />

      {/* Comment body */}
      <View style={styles.body}>
        {/* Bubble */}
        <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <Text style={[styles.authorName, { color: colors.textPrimary }]}>
              {comment.author.displayName}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatTimeAgo(comment.createdAt)}
            </Text>
          </View>
          {/* Content */}
          <Text style={[styles.content, { color: colors.text }]}>
            {comment.content}
          </Text>
        </View>

        {/* Actions row */}
        <View style={styles.actionsRow}>
          {/* Like button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLikePress?.(comment.id)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={comment.isLiked ? "favorite" : "favorite-border"}
              size={14}
              color={comment.isLiked ? colors.heartLiked : colors.textSecondary}
            />
            <Text
              style={[
                styles.actionText,
                {
                  color: comment.isLiked
                    ? colors.heartLiked
                    : colors.textSecondary,
                },
              ]}
            >
              {comment.likesCount ?? 0}
            </Text>
          </TouchableOpacity>

          {/* Reply button (only for top-level comments) */}
          {!isReply && onReplyPress && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onReplyPress?.(comment.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.actionText, { color: colors.textSecondary }]}
                >
                  Trả lời
                </Text>
              </TouchableOpacity>

              <Text style={[styles.dot, { color: colors.separatorDot }]}>
                •
              </Text>
            </>
          )}

          {/* For reply, show only dot separator before Report */}
          {isReply && (
            <Text style={[styles.dot, { color: colors.separatorDot }]}>•</Text>
          )}

          {/* Report button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onReportPress?.(comment.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>
              Báo cáo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                isReply
                onLikePress={onLikePress}
                onReportPress={onReportPress}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm, // 8px
    paddingHorizontal: Spacing.cardPadding - 4, // 12px
    paddingTop: Spacing.cardPadding - 4, // 12px
  },
  replyContainer: {
    paddingHorizontal: 0,
    paddingTop: Spacing.sm, // 8px
  },
  avatar: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  body: {
    flex: 1,
  },
  bubble: {
    paddingHorizontal: Spacing.cardPadding - 4, // 12px
    paddingTop: Spacing.sm, // 8px
    paddingBottom: Spacing.sm + 2, // 10px
    borderTopLeftRadius: 6,
    borderTopRightRadius: BorderRadius.xl, // 16px
    borderBottomLeftRadius: BorderRadius.xl, // 16px
    borderBottomRightRadius: BorderRadius.xl, // 16px
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontSize: Typography.sizes["13"], // 13px
    fontWeight: Typography.weights.bold,
    lineHeight: 19.5,
  },
  timestamp: {
    fontSize: Typography.sizes.xs, // 10px
    fontWeight: Typography.weights.normal,
    lineHeight: 15,
  },
  content: {
    fontSize: Typography.sizes["13"], // 13px
    fontWeight: Typography.weights.normal,
    lineHeight: 21.125,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md, // 16px
    paddingLeft: Spacing.cardPadding - 4, // 12px
    paddingTop: Spacing.sm, // 8px
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: Typography.sizes.sm, // 12px
    fontWeight: Typography.weights.normal,
    lineHeight: 16,
    textAlign: "center",
  },
  dot: {
    fontSize: Typography.sizes.sm, // 12px
    lineHeight: 16,
  },
  repliesContainer: {
    marginTop: Spacing.sm, // 8px
    marginLeft: Spacing.sm, // 8px indentation for replies
  },
});
