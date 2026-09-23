import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';

import { Colors, Shadows } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface CommunityFABProps {
  onPress: () => void;
}

/**
 * Floating Action Button for creating new posts
 */
export function CommunityFAB({ onPress }: CommunityFABProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor: '#2b7fff', // Figma: #2b7fff
          ...Shadows.lg,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <MaterialIcons name="add" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8, // Android shadow
  },
});
