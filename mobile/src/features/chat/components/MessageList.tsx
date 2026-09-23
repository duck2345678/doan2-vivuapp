/**
 * MessageList Component
 * Virtualized list of chat messages
 * Supports both DM and Group chat layouts
 * Matches Figma node 317:2269 (DM) and 317:2919 (Group)
 */
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { Spinner } from "@/shared/components/ui";
import { Colors, Spacing } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";

import type { Message } from "../types";
import { ChannelInviteMessage } from "./ChannelInviteMessage";
import { ImageMessageBubble } from "./ImageMessageBubble";
import { MessageBubble } from "./MessageBubble";
import { SharedCardMessage } from "./SharedCardMessage";
import { SystemMessageBubble } from "./SystemMessageBubble";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  /** Whether this is a group chat (affects message layout) */
  isGroupChat?: boolean;
  /** Callback when user taps join on a channel invite */
  onChannelInvitePress?: (
    invite: Message extends { type: "channelInvite"; invite: infer I }
      ? I
      : never,
  ) => void;
}

/**
 * Renders individual message item
 */
function MessageItem({
  message,
  isGroupChat,
  onChannelInvitePress,
}: {
  message: Message;
  isGroupChat: boolean;
  onChannelInvitePress?: (invite: any) => void;
}) {
  if (message.type === "system") {
    return (
      <SystemMessageBubble text={message.text} timeLabel={message.timeLabel} />
    );
  }

  if (message.type === "sharedCard") {
    return (
      <SharedCardMessage
        card={message.card}
        timeLabel={message.timeLabel}
        status={message.status}
      />
    );
  }

  if (message.type === "channelInvite") {
    return (
      <ChannelInviteMessage
        invite={message.invite}
        sender={message.sender}
        timeLabel={message.timeLabel}
        status={message.status}
        senderName={message.senderName}
        senderAvatar={message.senderAvatar}
        isGroupChat={isGroupChat}
        onJoinPress={() => onChannelInvitePress?.(message.invite)}
      />
    );
  }

  if (message.type === "image") {
    return (
      <ImageMessageBubble
        imageUrl={message.imageUrl}
        caption={message.caption}
        sender={message.sender}
        timeLabel={message.timeLabel}
        status={message.status}
        senderName={message.senderName}
        senderAvatar={message.senderAvatar}
        isGroupChat={isGroupChat}
      />
    );
  }

  return (
    <MessageBubble
      text={message.text}
      sender={message.sender}
      timeLabel={message.timeLabel}
      status={message.status}
      messageId={message.messageId}
      conversationId={message.conversationId}
      senderName={message.senderName}
      senderAvatar={message.senderAvatar}
      isGroupChat={isGroupChat}
      isUnsent={message.isUnsent}
    />
  );
}

/**
 * Chat message list with auto-scroll
 */
export function MessageList({
  messages,
  isLoading,
  isGroupChat = false,
  onChannelInvitePress,
}: MessageListProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const flatListRef = useRef<FlashListRef<Message>>(null);

  // FlashList v2 recommends using maintainVisibleContentPosition instead of inverted
  // We reverse the messages to display them in chronological order (oldest at top, newest at bottom)
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      return (
        <MessageItem
          message={item}
          isGroupChat={isGroupChat}
          onChannelInvitePress={onChannelInvitePress}
        />
      );
    },
    [isGroupChat, onChannelInvitePress],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Spinner size="lg" />
      </View>
    );
  }

  return (
    <FlashList
      ref={flatListRef}
      data={reversedMessages}
      renderItem={renderItem}
      // estimatedItemSize is deprecated in v2 and handled automatically
      keyExtractor={keyExtractor}
      style={StyleSheet.flatten([
        styles.list,
        { backgroundColor: colors.background },
      ])}
      contentContainerStyle={styles.contentContainer}
      maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
