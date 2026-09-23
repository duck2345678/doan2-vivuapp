/**
 * CommentComposer Component
 * Sticky bottom bar for composing comments
 */

import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth";
import { useMyProfile } from "@/features/profile";
import { Avatar } from "@/shared/components/ui";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";

interface CommentComposerProps {
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
  replyingTo?: string | null;
  onCancelReply?: () => void;
}

export function CommentComposer({
  onSubmit,
  isSubmitting = false,
  replyingTo,
  onCancelReply,
}: CommentComposerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");

  const currentUser = useAuthStore((state) => state.user);
  const { profile: myProfile } = useMyProfile();
  const currentUserAvatar =
    currentUser?.avatarUrl ?? myProfile?.avatarUrl ?? "";
  const currentUserName =
    currentUser?.displayName ?? myProfile?.displayName ?? "User";

  const handleSubmit = () => {
    if (text.trim() && !isSubmitting) {
      onSubmit(text.trim());
      setText("");
    }
  };

  const canSubmit = text.trim().length > 0 && !isSubmitting;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.borderLight,
          paddingBottom: Math.max(insets.bottom, Spacing.sm),
        },
        Shadows.lg,
      ]}
    >
      {/* Reply indicator */}
      {replyingTo && (
        <View style={styles.replyIndicator}>
          <MaterialIcons name="reply" size={14} color={colors.textSecondary} />
          <TouchableOpacity onPress={onCancelReply} style={styles.cancelReply}>
            <MaterialIcons
              name="close"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        {/* User avatar */}
        <Avatar
          size="sm"
          source={currentUserAvatar}
          name={currentUserName}
          style={styles.avatar}
        />

        {/* Input field */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.chipBackground },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Viết bình luận..."
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            editable={!isSubmitting}
          />

          {/* Emoji button (optional, inside input) */}
          <TouchableOpacity style={styles.emojiButton} activeOpacity={0.7}>
            <MaterialIcons
              name="insert-emoticon"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.7}
          style={[
            styles.sendButtonWrapper,
            !canSubmit && styles.sendButtonDisabled,
          ]}
        >
          <LinearGradient
            colors={
              canSubmit
                ? [colors.sendButton, colors.sendButtonGradientEnd]
                : [colors.chipBackground, colors.chipBackground]
            }
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.sendButton}
          >
            <MaterialIcons
              name="send"
              size={14}
              color={canSubmit ? "#fff" : colors.textSecondary}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.8,
    paddingHorizontal: Spacing.cardPadding - 4, // 12px
    paddingTop: Spacing.sm + 3, // ~11px
  },
  replyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
    gap: 4,
  },
  cancelReply: {
    marginLeft: "auto",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm, // 8px
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.cardPadding - 4, // 12px
    minHeight: 36,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes["13"], // 13px
    fontWeight: Typography.weights.normal,
    paddingVertical: Spacing.xs + 4, // ~8px
    maxHeight: 100,
  },
  emojiButton: {
    padding: 4,
  },
  sendButtonWrapper: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
