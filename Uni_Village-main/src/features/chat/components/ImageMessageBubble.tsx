/**
 * ImageMessageBubble Component
 * Renders a single image message bubble
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import type { MessageSender, MessageStatus } from '../types';
import { SenderLabel } from './SenderLabel';

interface ImageMessageBubbleProps {
  imageUrl: string;
  caption?: string;
  sender: MessageSender;
  timeLabel: string;
  status?: MessageStatus;
  senderName?: string;
  senderAvatar?: string;
  isGroupChat?: boolean;
}

export const ImageMessageBubble = memo(function ImageMessageBubble({
  imageUrl,
  caption,
  sender,
  timeLabel,
  status,
  senderName,
  senderAvatar,
  isGroupChat = false,
}: ImageMessageBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { width } = useWindowDimensions();

  const isMe = sender === 'me';
  const showSenderLabel = isGroupChat && !isMe && senderName;

  // Max width for the image bubble
  const maxWidth = width * 0.75;

  const renderStatusIcon = () => {
    if (!isMe || !status) return null;

    const timestampColor = colors.separatorDot;

    if (status === 'sending') {
      return (
        <View style={styles.statusIcon}>
          <ActivityIndicator size="small" color={timestampColor} />
        </View>
      );
    }

    const iconName = status === 'read' || status === 'delivered' ? 'checkmark-done' : 'checkmark';
    const iconColor = status === 'read' || status === 'delivered' ? colors.fabBlue : timestampColor;

    return (
      <View style={styles.statusIcon}>
        <Ionicons name={iconName} size={14} color={iconColor} />
      </View>
    );
  };

  return (
    <View style={[styles.container, isMe && styles.containerMe]}>
      {showSenderLabel && (
        <SenderLabel senderName={senderName!} senderAvatar={senderAvatar} />
      )}

      <View
        style={[
          styles.bubble,
          { backgroundColor: isMe ? colors.fabBlue : colors.chipBackground },
          isMe ? styles.bubbleMe : styles.bubbleOther,
        ]}
      >
        <Image
          source={imageUrl}
          style={[styles.image, { width: maxWidth - Spacing.md }]}
          contentFit="cover"
          transition={200}
        />
        {caption && (
           <Text style={[styles.text, { color: isMe ? '#FFFFFF' : colors.textPrimary }]}>{caption}</Text>
        )}
      </View>

      <View style={[styles.metaRow, isMe && styles.metaRowMe]}>
        <Text style={[styles.timestamp, { color: colors.separatorDot }]}>
          {timeLabel}
        </Text>
        {renderStatusIcon()}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    maxWidth: '75%',
    marginBottom: Spacing.sm,
  },
  containerMe: {
    alignSelf: 'flex-end',
  },
  bubble: {
    padding: Spacing.xs,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bubbleOther: {
    borderTopLeftRadius: 4,
  },
  bubbleMe: {
    borderTopRightRadius: 4,
  },
  image: {
    height: 200,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  text: {
    marginTop: Spacing.xs,
    marginHorizontal: Spacing.sm,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  metaRowMe: {
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    fontWeight: Typography.weights.normal,
    lineHeight: 16.5,
  },
  statusIcon: {
    marginLeft: 2,
  },
});
