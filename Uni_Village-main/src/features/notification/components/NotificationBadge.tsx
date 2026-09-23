/**
 * NotificationBadge Component
 * Displays unread notification count on header/tab icons
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNotificationStore } from "../store";

interface NotificationBadgeProps {
  size?: "small" | "medium";
  style?: object;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  size = "small",
  style,
}) => {
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  if (unreadCount === 0) return null;

  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);
  const isSmall = size === "small";

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSmall : styles.badgeMedium,
        style,
      ]}
    >
      <Text
        style={[styles.text, isSmall ? styles.textSmall : styles.textMedium]}
      >
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#F44336",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },
  badgeSmall: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    top: -4,
    right: -4,
  },
  badgeMedium: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    top: -6,
    right: -6,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
});

export default NotificationBadge;
