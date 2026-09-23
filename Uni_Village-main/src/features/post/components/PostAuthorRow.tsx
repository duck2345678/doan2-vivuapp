/**
 * PostAuthorRow Component
 * Author info with avatar, online indicator, name, badge, and timestamp
 */

import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { formatRelativeTime } from "@/shared/utils";

import { Avatar } from "@/shared/components/ui";
import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import type { PostVisibility } from "../types";

interface PostAuthorRowProps {
  authorId?: number;
  authorName?: string;
  authorAvatarUrl?: string;
  createdAt?: string;
  visibility?: PostVisibility;
  onMenuPress?: () => void;
}

const VISIBILITY_LABELS: Record<PostVisibility, string> = {
  public: "Công khai",
  friends: "Bạn bè",
  private: "Riêng tư",
};

export function PostAuthorRow({
  authorId,
  authorName,
  authorAvatarUrl,
  createdAt,
  visibility,
  onMenuPress,
}: PostAuthorRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handleAvatarPress = useCallback(() => {
    if (authorId) {
      router.push(`/profile/${authorId}`);
    }
  }, [authorId]);

  return (
    <View style={styles.container}>
      {/* Avatar with online indicator */}
      <View style={styles.avatarContainer}>
        <Avatar
          size="md"
          source={authorAvatarUrl}
          name={authorName}
          style={styles.avatar}
          onPress={handleAvatarPress}
        />
      </View>

      {/* Author info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {authorName}
          </Text>
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {createdAt ? formatRelativeTime(createdAt) : ""} •{" "}
          {visibility ? VISIBILITY_LABELS[visibility] : ""}
        </Text>
      </View>

      {/* Menu button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={onMenuPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons
          name="more-horiz"
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.cardPadding - 4, // 12px
    paddingVertical: Spacing.sm,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    borderWidth: 2,
    borderColor: "#dbeafe",
  },
  onlineIndicator: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1.6,
    right: -2,
    bottom: -2,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.sm + 2, // 10px gap
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: Typography.sizes["15"], // 15px
    fontWeight: Typography.weights.bold,
    lineHeight: 22.5,
  },
  badge: {
    marginTop: 1,
  },
  meta: {
    fontSize: Typography.sizes.xs + 1, // 11px
    fontWeight: Typography.weights.normal,
    lineHeight: 16.5,
  },
  menuButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
