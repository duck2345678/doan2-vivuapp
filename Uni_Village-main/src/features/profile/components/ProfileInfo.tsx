/**
 * ProfileInfo Component
 * Displays user's avatar, display name and bio
 */

import { Avatar } from "@/shared/components/ui";
import { Colors } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { ms, s, vs } from "react-native-size-matters";
import type { Profile } from "../types";

interface ProfileInfoProps {
  profile: Profile;
  /** Optional container style for layout customization */
  style?: ViewStyle;
}

export function ProfileInfo({ profile, style }: ProfileInfoProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, style]}>
      {/* Avatar */}
      <Avatar
        source={profile.avatarUrl}
        name={profile.displayName}
        size="xxl"
        style={styles.avatar}
      />
      <Text style={[styles.displayName, { color: colors.text }]}>
        {profile.displayName}
      </Text>
      {profile.bio && (
        <Text style={[styles.bio, { color: colors.textSecondary }]}>
          {profile.bio}
        </Text>
      )}
      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <View style={styles.interestsContainer}>
          {profile.interests.map((interest, index) => (
            <View
              key={index}
              style={[
                styles.interestChip,
                {
                  backgroundColor: colors.chipBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.interestText, { color: colors.tint }]}>
                {interest}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: s(16),
    paddingTop: vs(24),
    paddingBottom: vs(8),
    alignItems: "center",
  },
  avatar: {
    marginBottom: vs(16),
  },
  displayName: {
    fontSize: ms(28),
    fontWeight: "700",
    marginBottom: vs(8),
    textAlign: "center",
  },
  bio: {
    fontSize: ms(15),
    fontWeight: "400",
    lineHeight: ms(22),
    textAlign: "center",
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: s(8),
    marginTop: vs(12),
  },
  interestChip: {
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: 16,
    borderWidth: 1,
  },
  interestText: {
    fontSize: ms(13),
    fontWeight: "500",
  },
});
