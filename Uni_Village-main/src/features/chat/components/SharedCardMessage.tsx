/**
 * SharedCardMessage Component
 * Renders a shared content card (e.g., itinerary) in the chat
 * Matches Figma node 317:2269
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href, router } from 'expo-router';

import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import type { MessageStatus, SharedCard } from '../types';

interface SharedCardMessageProps {
  card: SharedCard;
  timeLabel: string;
  status?: MessageStatus;
}

/**
 * Shared content card message (itinerary, location, etc.)
 */
// PERF: Prevents message rows from re-rendering on every incoming WS event
export const SharedCardMessage = memo(function SharedCardMessage({
  card,
  timeLabel,
  status,
}: SharedCardMessageProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handlePress = () => {
    router.push(card.route as Href);
  };

  // Figma colors
  const cardBackground = colors.locationChipGradientStart; // #EFF6FF
  const timestampColor = colors.separatorDot;
  const actionColor = colors.actionBlue; // #155DFC

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: cardBackground, opacity: pressed ? 0.9 : 1 },
        ]}
        accessibilityLabel={`Xem ${card.title}`}
        accessibilityRole="button"
      >
        <Image
          source={{ uri: card.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {card.title}
          </Text>
          <Text style={[styles.cta, { color: actionColor }]}>{card.ctaText}</Text>
        </View>
      </Pressable>
      <View style={styles.metaRow}>
        <Text style={[styles.timestamp, { color: timestampColor }]}>
          {timeLabel}
        </Text>
        {status && (
          <View style={styles.statusIcon}>
            <Ionicons
              name={status === 'read' ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={timestampColor}
            />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    maxWidth: 220,
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 128,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  content: {
    padding: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  cta: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.normal,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
    gap: 4,
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
