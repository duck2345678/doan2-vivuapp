/**
 * ChannelInviteMessage Component
 * Renders a channel invite card in chat context
 */
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import type { ChannelInviteData, MessageSender, MessageStatus } from "../types";

interface ChannelInviteMessageProps {
  invite: ChannelInviteData;
  sender: MessageSender;
  timeLabel: string;
  status?: MessageStatus;
  senderName?: string;
  senderAvatar?: string;
  isGroupChat?: boolean;
  /** Called when user taps the join button or card */
  onJoinPress?: () => void;
}

/**
 * Channel invite message component for chat
 */
export function ChannelInviteMessage({
  invite,
  sender,
  timeLabel,
  status,
  senderName,
  isGroupChat,
  onJoinPress,
}: ChannelInviteMessageProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const isMe = sender === "me";

  return (
    <View
      style={[
        styles.container,
        isMe ? styles.containerMe : styles.containerOther,
      ]}
    >
      {/* Sender name for group chats */}
      {isGroupChat && !isMe && senderName && (
        <Text style={[styles.senderName, { color: colors.textSecondary }]}>
          {senderName}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
          },
        ]}
        onPress={onJoinPress}
        activeOpacity={0.9}
      >
        {/* Top row: Icon + Channel info */}
        <View style={styles.topRow}>
          {/* Gradient icon tile */}
          <LinearGradient
            colors={["#a855f7", "#6366f1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconTile}
          >
            {invite.emoji ? (
              <Text style={styles.emojiIcon}>{invite.emoji}</Text>
            ) : (
              <MaterialIcons name="groups" size={28} color="#ffffff" />
            )}
          </LinearGradient>

          {/* Channel info */}
          <View style={styles.channelInfo}>
            <Text
              style={[styles.channelName, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {invite.name}
            </Text>
            {/* Member count */}
            <View style={styles.memberRow}>
              <MaterialIcons name="people" size={14} color="#a855f7" />
              <Text style={[styles.memberCount, { color: "#a855f7" }]}>
                {invite.memberCount?.toLocaleString() || 0} thành viên
              </Text>
            </View>
          </View>
        </View>

        {/* Description if exists */}
        {invite.description && (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {invite.description}
          </Text>
        )}

        {/* CTA Button */}
        <TouchableOpacity onPress={onJoinPress} activeOpacity={0.8}>
          <LinearGradient
            colors={["#a855f7", "#6366f1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <MaterialIcons name="login" size={18} color="#ffffff" />
            <Text style={styles.ctaText}>Tham gia ngay</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Inviter info */}
        {invite.inviterName && (
          <Text style={[styles.inviterText, { color: colors.textSecondary }]}>
            Được mời bởi {invite.inviterName}
          </Text>
        )}
      </TouchableOpacity>

      {/* Time label */}
      <View
        style={[styles.metaRow, isMe ? styles.metaRowMe : styles.metaRowOther]}
      >
        <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
          {timeLabel}
        </Text>
        {isMe && status && (
          <MaterialIcons
            name={
              status === "read"
                ? "done-all"
                : status === "delivered"
                  ? "done-all"
                  : "done"
            }
            size={14}
            color={status === "read" ? colors.actionBlue : colors.textSecondary}
            style={styles.statusIcon}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    maxWidth: "80%",
  },
  containerMe: {
    alignSelf: "flex-end",
  },
  containerOther: {
    alignSelf: "flex-start",
  },
  senderName: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginBottom: 4,
    marginLeft: 4,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    minWidth: 220,
    ...Shadows.sm,
  },
  topRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: "flex-start",
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiIcon: {
    fontSize: 28,
  },
  channelInfo: {
    flex: 1,
    justifyContent: "center",
  },
  channelName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberCount: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  inviterText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaRowMe: {
    justifyContent: "flex-end",
  },
  metaRowOther: {
    justifyContent: "flex-start",
  },
  timeLabel: {
    fontSize: Typography.sizes.xs,
  },
  statusIcon: {
    marginLeft: 4,
  },
});
