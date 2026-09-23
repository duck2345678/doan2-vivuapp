/**
 * ChatComposer Component
 * Message input with attachments and send button
 * Matches Figma node 317:2269
 */
import { Feather, Ionicons } from '@expo/vector-icons';
import type { ImagePickerAsset } from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { FileAttachmentThumbnails } from './FileAttachmentThumbnails';

interface ChatComposerProps {
  onSend: (text: string) => void;
  onImagePress?: () => void;
  onCalendarPress?: () => void;
  isSending?: boolean;
  attachments?: ImagePickerAsset[];
  onRemoveAttachment?: (uri: string) => void;
}

/**
 * Chat input composer with action buttons
 */
export function ChatComposer({
  onSend,
  onImagePress,
  onCalendarPress,
  isSending,
  attachments = [],
  onRemoveAttachment,
}: ChatComposerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const handleSend = () => {
    // Allow sending attachments without text
    if (attachments.length > 0) {
      onSend(text.trim());
      setText('');
    } else {
      // Require text if no attachments
      const trimmedText = text.trim();
      if (trimmedText && !isSending) {
        onSend(trimmedText);
        setText('');
      }
    }
  };

  const handleImagePress = () => {
    onImagePress?.();
  };

  const handleCalendarPress = () => {
    onCalendarPress?.();
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isSending;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.borderLight,
          paddingBottom: Math.max(insets.bottom, Spacing.sm),
        },
      ]}
    >
      <FileAttachmentThumbnails
        attachments={attachments}
        onRemove={onRemoveAttachment!}
      />
      <View style={styles.content}>
        {/* Image attachment button */}
        <Pressable
          onPress={handleImagePress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Đính kèm ảnh"
          accessibilityRole="button"
        >
          <Feather name="image" size={24} color={colors.textSecondary} />
        </Pressable>

        {/* Calendar/itinerary button */}
        <Pressable
          onPress={handleCalendarPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Chia sẻ lịch trình"
          accessibilityRole="button"
        >
          <Feather name="calendar" size={24} color={colors.textSecondary} />
        </Pressable>

        {/* Text input */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.chipBackground },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={text}
            onChangeText={setText}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="rgba(10,10,10,0.5)"
            multiline
            maxLength={1000}
            editable={!isSending}
            returnKeyType="default"
            blurOnSubmit={false}
            accessibilityLabel="Nhập tin nhắn"
          />
        </View>

        {/* Send button */}
        <Pressable
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: canSend ? colors.sendButton : colors.chipBackground,
              opacity: pressed && canSend ? 0.8 : 1,
            },
          ]}
          disabled={!canSend}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Gửi tin nhắn"
          accessibilityRole="button"
        >
          <Ionicons
            name="send"
            size={20}
            color={canSend ? '#FFFFFF' : colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    borderRadius: 9999, // Pill shape
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
