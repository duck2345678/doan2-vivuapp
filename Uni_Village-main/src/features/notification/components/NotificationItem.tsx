/**
 * NotificationItem Component
 * Renders a single notification item in the list
 */

import { Colors } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NotificationResponse, NotificationType } from "../types";

interface NotificationItemProps {
  notification: NotificationResponse;
  onPress: (notification: NotificationResponse) => void;
  onDelete?: (id: number) => void;
}

const getNotificationIcon = (
  type: NotificationType,
): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case NotificationType.POST_REACTION:
      return "heart";
    case NotificationType.POST_COMMENT:
    case NotificationType.COMMENT_REPLY:
      return "chatbubble";
    case NotificationType.FRIEND_REQUEST:
    case NotificationType.FRIEND_ACCEPTED:
      return "person-add";
    case NotificationType.CHANNEL_INVITE:
    case NotificationType.JOIN_REQUEST_ACCEPTED:
    case NotificationType.JOIN_REQUEST_REJECTED:
      return "people";
    case NotificationType.ADMIN_WARNING:
      return "warning";
    case NotificationType.POST_REMOVED:
      return "trash";
    default:
      return "notifications";
  }
};

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.POST_REACTION:
      return "#E91E63";
    case NotificationType.POST_COMMENT:
    case NotificationType.COMMENT_REPLY:
      return "#2196F3";
    case NotificationType.FRIEND_REQUEST:
    case NotificationType.FRIEND_ACCEPTED:
      return "#4CAF50";
    case NotificationType.CHANNEL_INVITE:
    case NotificationType.JOIN_REQUEST_ACCEPTED:
      return "#9C27B0";
    case NotificationType.JOIN_REQUEST_REJECTED:
      return "#FF9800";
    case NotificationType.ADMIN_WARNING:
    case NotificationType.POST_REMOVED:
      return "#F44336";
    default:
      return "#607D8B";
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onDelete,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const iconName = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  const handlePress = useCallback(() => {
    onPress(notification);
  }, [notification, onPress]);

  const handleDelete = useCallback(() => {
    onDelete?.(notification.id);
  }, [notification.id, onDelete]);

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: notification.isRead
            ? colors.background
            : colors.card,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={handlePress}
      android_ripple={{ color: colors.border }}
    >
      {/* Icon */}
      <View
        style={[styles.iconContainer, { backgroundColor: iconColor + "20" }]}
      >
        <Ionicons name={iconName} size={24} color={iconColor} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontWeight: notification.isRead ? "400" : "600",
            },
          ]}
          numberOfLines={1}
        >
          {notification.title}
        </Text>
        <Text
          style={[styles.message, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {notification.message}
        </Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {formatTimeAgo(notification.createdAt)}
        </Text>
      </View>

      {/* Unread indicator */}
      {!notification.isRead && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}

      {/* Delete button */}
      {onDelete && (
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default NotificationItem;
