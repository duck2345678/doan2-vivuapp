import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Avatar } from "@/shared/components/ui";
import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import type { PostAuthor } from "../types";
import { formatTimeAgo } from "../utils/formatTime";

const getVisibilityIcon = (visibility?: string) => {
  if (!visibility) return null;
  switch (visibility.toUpperCase()) {
    case "PUBLIC":
      return { name: "public", color: "#10b981" }; // green
    case "PRIVATE":
      return { name: "lock", color: "#f59e0b" }; // amber
    case "FRIENDS":
      return { name: "people", color: "#3b82f6" }; // blue
    default:
      return null;
  }
};

interface PostHeaderProps {
  author: PostAuthor;
  createdAt: string;
  visibility?: string; // PUBLIC, PRIVATE, FRIENDS
  onMenuPress: () => void;
  onAvatarPress?: () => void;
}

/**
 * Post header with avatar, author name, timestamp, and menu button
 */
export function PostHeader({
  author,
  createdAt,
  visibility,
  onMenuPress,
  onAvatarPress,
}: PostHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onAvatarPress}
        activeOpacity={0.8}
        style={styles.avatarSection}
      >
        <Avatar size="md" source={author.avatarUrl} name={author.displayName} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>
            {author.displayName}
          </Text>
          <View style={styles.timestampRow}>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatTimeAgo(createdAt)}
            </Text>
            {visibility &&
              (() => {
                const icon = getVisibilityIcon(visibility);
                return icon ? (
                  <>
                    <Text style={[styles.dot, { color: colors.textSecondary }]}>
                      •
                    </Text>
                    <MaterialIcons
                      name={icon.name as any}
                      size={14}
                      color={icon.color}
                      style={styles.visibilityIcon}
                    />
                  </>
                ) : null;
              })()}
          </View>
        </View>
      </TouchableOpacity>
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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.cardPadding,
    paddingTop: Spacing.cardPadding,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  info: {
    flex: 1,
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: Typography.sizes.base, // 16px
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
  },
  timestamp: {
    fontSize: Typography.sizes.md, // 14px
    fontWeight: Typography.weights.normal,
    lineHeight: 20,
  },
  dot: {
    fontSize: Typography.sizes.md,
    marginHorizontal: 2,
  },
  visibilityIcon: {
    marginLeft: 2,
  },
  menuButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
