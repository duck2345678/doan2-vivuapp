/**
 * ThreadInfoHeader Component
 * Header with back button and "Thông tin" title
 * Matches Figma node 532:749
 */
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface ThreadInfoHeaderProps {
  title?: string;
}

/**
 * Thread info screen header
 */
export function ThreadInfoHeader({ title = 'Thông tin' }: ThreadInfoHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/community');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: colors.background,
          borderBottomColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Back button */}
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  title: {
    fontSize: Typography.sizes.lg, // 18px
    fontWeight: Typography.weights.normal,
    lineHeight: 28,
    marginLeft: Spacing.sm,
  },
});
