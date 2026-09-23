/**
 * PublicProfileHeader Component
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/shared/components/ui";
import { BorderRadius, Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";

import type { PublicProfile } from "../types";

interface PublicProfileHeaderProps {
  profile: PublicProfile;
  onMessagePress?: () => void;
  onReportPress?: () => void;
  isOwnProfile?: boolean;
}

export function PublicProfileHeader({
  profile,
  onMessagePress,
  onReportPress,
  isOwnProfile,
}: PublicProfileHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Avatar
          source={profile.avatarUrl}
          name={profile.displayName}
          size="xl"
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {profile.displayName}
            </Text>
            {/* Report button for other users */}
            {!isOwnProfile && (
              <Pressable
                style={({ pressed }) => [
                  styles.reportButton,
                  pressed && styles.pressed,
                ]}
                onPress={onReportPress}
                accessibilityLabel="Báo cáo người dùng"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="flag-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            )}
          </View>
          <Text style={[styles.handle, { color: colors.textSecondary }]}>
            @{profile.username}
          </Text>
          {profile.bio ? (
            <Text style={[styles.bio, { color: colors.textPrimary }]}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Interests/Sở thích */}
      {profile.interests && profile.interests.length > 0 && (
        <View style={styles.interestsContainer}>
          <Text style={[styles.interestsLabel, { color: colors.textSecondary }]}>
            Sở thích
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.interestsScrollContent}
          >
            {profile.interests.map((interest, index) => (
              <View
                key={`${interest}-${index}`}
                style={[
                  styles.interestChip,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text style={[styles.interestText, { color: colors.textPrimary }]}>
                  {interest}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Hide message button when viewing own profile */}
      {!isOwnProfile && (
        <Pressable
          style={({ pressed }) => [
            styles.messageButton,
            { backgroundColor: colors.actionBlue },
            pressed && styles.pressed,
          ]}
          onPress={onMessagePress}
          accessibilityLabel="Nhắn tin"
          accessibilityRole="button"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.messageText}>Nhắn tin</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    lineHeight: 28,
    flex: 1,
  },
  reportButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  handle: {
    fontSize: Typography.sizes.md,
    lineHeight: 20,
    marginTop: 2,
  },
  bio: {
    fontSize: Typography.sizes.md,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  interestsContainer: {
    marginTop: Spacing.md,
  },
  interestsLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  interestsScrollContent: {
    gap: Spacing.xs,
  },
  interestChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  interestText: {
    fontSize: Typography.sizes.sm,
  },
  messageButton: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    minHeight: 44,
  },
  messageText: {
    color: "#fff",
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
