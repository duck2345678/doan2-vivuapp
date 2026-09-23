/**
 * PostDetailHeader Component
 * Screen header with back button and title
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface PostDetailHeaderProps {
  title?: string;
  onMenuPress?: () => void;
}

export function PostDetailHeader({ title = 'Bài viết', onMenuPress }: PostDetailHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        {onMenuPress ? (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="more-vert" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.menuSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 68,
    paddingHorizontal: Spacing.cardPadding - 4, // 12px as per Figma
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.cardPadding - 4, // 12px gap
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuSpacer: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: Typography.sizes['2xl'], // 24px
    fontWeight: Typography.weights.normal,
    lineHeight: 36,
  },
});
