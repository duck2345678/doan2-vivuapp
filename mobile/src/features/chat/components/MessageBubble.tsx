/**
 * MessageBubble Component
 * Renders a single text message bubble (incoming or outgoing)
 * Supports group chat sender labels
 * Matches Figma node 317:2269 (DM) and 317:2919 (Group)
 */
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { ItineraryShareCard } from "@/features/itinerary/components/ItineraryShareCard";
import { Colors, Spacing, Typography } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";

import { useMessageActions } from "../hooks";
import type { MessageSender, MessageStatus } from "../types";
import { SenderLabel } from "./SenderLabel";

interface MessageBubbleProps {
  text: string;
  sender: MessageSender;
  timeLabel: string;
  status?: MessageStatus;
  /** Message ID for actions like unsend */
  messageId?: number;
  /** Conversation ID for cache updates */
  conversationId?: string;
  /** For group chats: sender name to display above bubble */
  senderName?: string;
  /** For group chats: sender avatar URL */
  senderAvatar?: string;
  /** Whether this is a group chat (affects layout) */
  isGroupChat?: boolean;
  /** Error message if status is error */
  errorMessage?: string;
  /** Callback for retry when message failed */
  onRetry?: () => void;
  /** Whether message has been unsent/deleted */
  isUnsent?: boolean;
}

/**
 * Parse embedded itinerary from message content (same logic as Community PostCard)
 */
function parseEmbeddedItinerary(content: string) {
  const match = content.match(/\[ITINERARY_SHARE\](.*?)\[\/ITINERARY_SHARE\]/s);
  if (match) {
    try {
      const tripData = JSON.parse(match[1]);
      const cleanContent = content
        .replace(/\n*\[ITINERARY_SHARE\].*?\[\/ITINERARY_SHARE\]/s, "")
        .trim();
      // Convert to ItineraryShareData format
      const itineraryShare = {
        id: tripData.id || String(Date.now()),
        dayLabel: tripData.title || "Lịch trình",
        date: tripData.date,
        stopsCount: tripData.stopsCount || tripData.stops?.length || 0,
        timeRange: tripData.timeRange || "",
        tags: ["Lịch trình"],
        stops: (tripData.stops || []).map((stop: any, index: number) => ({
          id: stop.id || String(index),
          time: stop.time || "",
          name: stop.name,
          address: tripData.area || "",
          order: index + 1,
          thumbnail: stop.thumbnail || stop.imageUrl,
        })),
        originalTripData: tripData,
      };
      return { cleanContent, itineraryShare };
    } catch {
      return { cleanContent: content, itineraryShare: null };
    }
  }
  return { cleanContent: content, itineraryShare: null };
}

/**
 * Chat message bubble with timestamp and optional sender label
 */
// PERF: Prevents message rows from re-rendering on every incoming WS event
export const MessageBubble = memo(function MessageBubble({
  text,
  sender,
  timeLabel,
  status,
  messageId,
  conversationId,
  senderName,
  senderAvatar,
  isGroupChat = false,
  errorMessage,
  onRetry,
  isUnsent = false,
}: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { unsendMessage } = useMessageActions();

  const isMe = sender === "me";
  const showSenderLabel = isGroupChat && !isMe && senderName;

  // Parse embedded itinerary from message content
  const { cleanContent, itineraryShare } = useMemo(
    () => parseEmbeddedItinerary(text),
    [text],
  );
  const hasItinerary = !!itineraryShare;

  // Handle itinerary card press - navigate to detail screen
  const handleItineraryPress = useCallback(() => {
    if (!itineraryShare) return;

    // Build trip data for SharedItineraryDetailScreen (same format as PostDetailScreen)
    const tripData = {
      id: itineraryShare.id,
      tripName: itineraryShare.dayLabel,
      startDate: itineraryShare.date || new Date().toISOString(),
      startTime: new Date().toISOString(),
      destinations: (itineraryShare.stops || []).map(
        (stop: any, index: number) => ({
          id: stop.id || String(index + 1),
          name: stop.name || "Địa điểm",
          time: stop.time,
          address: stop.address,
          thumbnail: stop.thumbnail,
          order: index + 1,
        }),
      ),
      area: itineraryShare.stops?.[0]?.address || "",
    };

    router.push({
      pathname: "/(modals)/shared-itinerary",
      params: { tripData: JSON.stringify(tripData) },
    });
  }, [itineraryShare, router]);

  // Figma colors
  const bubbleBackgroundColor = isMe ? colors.fabBlue : colors.chipBackground;
  const textColor = isMe ? "#FFFFFF" : colors.textPrimary;
  const timestampColor = colors.separatorDot;

  const handleLongPress = useCallback(() => {
    if (!messageId || !conversationId || isUnsent) return;

    const options = [];
    const handlers: (() => void)[] = [];

    if (isMe) {
      options.push("Thu hồi tin nhắn");
      handlers.push(() => {
        Alert.alert(
          "Thu hồi tin nhắn",
          "Bạn có chắc chắn muốn thu hồi tin nhắn này? Tin nhắn sẽ bị xóa cho tất cả mọi người.",
          [
            { text: "Hủy", style: "cancel" },
            {
              text: "Thu hồi",
              style: "destructive",
              onPress: () => {
                unsendMessage.mutate({ messageId, conversationId });
              },
            },
          ],
        );
      });
    }

    options.push("Sao chép");
    handlers.push(async () => {
      await Clipboard.setStringAsync(cleanContent);
      Alert.alert("Đã sao chép", "Nội dung tin nhắn đã được sao chép.");
    });

    options.push("Hủy");
    handlers.push(() => {});

    if (Platform.OS === "ios") {
      Alert.alert(
        "",
        "",
        options.map((option, index) => ({
          text: option,
          style:
            index === 0 && isMe
              ? "destructive"
              : index === options.length - 1
                ? "cancel"
                : "default",
          onPress: handlers[index],
        })),
      );
    } else {
      Alert.alert(
        "Tùy chọn tin nhắn",
        "",
        options.map((option, index) => ({
          text: option,
          style:
            index === 0 && isMe
              ? "destructive"
              : index === options.length - 1
                ? "cancel"
                : "default",
          onPress: handlers[index],
        })),
      );
    }
  }, [messageId, conversationId, isMe, isUnsent, cleanContent, unsendMessage]);

  const renderStatusIcon = () => {
    if (!isMe || !status) return null;

    if (status === "sending") {
      return (
        <View style={styles.statusIcon}>
          <ActivityIndicator size="small" color={timestampColor} />
        </View>
      );
    }

    const iconName =
      status === "read" || status === "delivered"
        ? "checkmark-done"
        : "checkmark";
    const iconColor =
      status === "read" || status === "delivered"
        ? colors.fabBlue
        : timestampColor;

    return (
      <View style={styles.statusIcon}>
        <Ionicons name={iconName} size={14} color={iconColor} />
      </View>
    );
  };

  return (
    <Pressable
      style={[styles.container, isMe && styles.containerMe]}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      {/* Sender label for group chat incoming messages */}
      {showSenderLabel && (
        <SenderLabel senderName={senderName!} senderAvatar={senderAvatar} />
      )}

      {/* Show text bubble if there's text content */}
      {cleanContent.length > 0 && (
        <View
          style={[
            styles.bubble,
            { backgroundColor: bubbleBackgroundColor },
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isUnsent && styles.bubbleUnsent,
          ]}
        >
          <Text
            style={[
              styles.text,
              { color: textColor },
              isUnsent && styles.textUnsent,
            ]}
          >
            {cleanContent}
          </Text>
        </View>
      )}

      {hasItinerary && (
        <View style={styles.itineraryContainer}>
          <ItineraryShareCard
            itinerary={itineraryShare}
            onPress={handleItineraryPress}
          />
        </View>
      )}

      <View style={[styles.metaRow, isMe && styles.metaRowMe]}>
        <Text style={[styles.timestamp, { color: timestampColor }]}>
          {timeLabel}
        </Text>
        {renderStatusIcon()}
        {isMe && errorMessage && onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Ionicons
              name="alert-circle"
              size={16}
              color={colors.error || "#FF4444"}
            />
            <Text
              style={[styles.retryText, { color: colors.error || "#FF4444" }]}
            >
              Tap to retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    maxWidth: "75%",
    marginBottom: Spacing.sm,
  },
  containerMe: {
    alignSelf: "flex-end",
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  bubbleOther: {
    borderTopLeftRadius: 4,
  },
  bubbleMe: {
    borderTopRightRadius: 4,
  },
  text: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: 4,
  },
  metaRowMe: {
    justifyContent: "flex-end",
  },
  timestamp: {
    fontSize: 11,
    fontWeight: Typography.weights.normal,
    lineHeight: 16.5,
  },
  statusIcon: {
    marginLeft: 2,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryText: {
    fontSize: 11,
    fontWeight: Typography.weights.medium,
  },
  bubbleUnsent: {
    opacity: 0.6,
  },
  textUnsent: {
    fontStyle: "italic",
  },
  itineraryContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
});
