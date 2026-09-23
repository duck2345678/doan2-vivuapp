/**
 * MemberSelectRow Component
 * User row with avatar, online status, name, and circular checkbox for selection
 * Matches Figma node 499:1729
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/shared/components/ui";
import { Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";

/**
 * Selectable user display type - supports both FriendPreview and simpler user objects
 */
export interface SelectableUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isOnline?: boolean;
  statusText?: string;
}

interface MemberSelectRowProps {
  friend: SelectableUser;
  isSelected: boolean;
  onToggle: (friend: SelectableUser) => void;
}

/**
 * Selectable member row for channel creation step 2
 */
export function MemberSelectRow({
  friend,
  isSelected,
  onToggle,
}: MemberSelectRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handlePress = () => {
    onToggle(friend);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${friend.displayName}${isSelected ? ", đã chọn" : ""}`}
    >
      {/* Avatar with online indicator */}
      <View style={styles.avatarContainer}>
        <Avatar source={friend.avatarUrl} name={friend.displayName} size="lg" />
        {friend.isOnline && (
          <View
            style={[
              styles.onlineIndicator,
              { backgroundColor: colors.onlineIndicator },
            ]}
          />
        )}
      </View>

      {/* Name and status */}
      <View style={styles.textContainer}>
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {friend.displayName}
        </Text>
        {friend.statusText && (
          <Text
            style={[styles.status, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {friend.statusText}
          </Text>
        )}
      </View>

      {/* Circular checkbox */}
      <View
        style={[
          styles.checkbox,
          isSelected
            ? { backgroundColor: colors.fabBlue, borderColor: colors.fabBlue }
            : {
                backgroundColor: "transparent",
                borderColor: colors.checkboxBorder,
              },
        ]}
      >
        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 75,
  },
  pressed: {
    opacity: 0.7,
  },
  avatarContainer: {
    position: "relative",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  textContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: Typography.weights.medium,
    marginBottom: 2,
  },
  status: {
    fontSize: Typography.sizes.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
