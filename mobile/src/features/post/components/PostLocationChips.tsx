/**
 * PostLocationChips Component
 * Location chips with gradient background and pin icon
 */

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { PostDetailLocation } from '../types';

interface PostLocationChipsProps {
  locations: PostDetailLocation[];
  onLocationPress?: (location: PostDetailLocation) => void;
}

export function PostLocationChips({ locations, onLocationPress }: PostLocationChipsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  if (locations.length === 0) return null;

  return (
    <View style={styles.container}>
      {locations.map((location) => (
        <TouchableOpacity
          key={location.id}
          onPress={() => onLocationPress?.(location)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.locationChipGradientStart, colors.locationChipGradientEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.chip, { borderColor: colors.locationChipBorder }]}
          >
            <MaterialIcons
              name="location-on"
              size={12}
              color={colors.locationChipText}
            />
            <Text style={[styles.chipText, { color: colors.locationChipText }]}>
              {location.name}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.cardPadding - 4, // 12px
    paddingTop: Spacing.cardPadding - 4, // 12px
    gap: Spacing.sm - 2, // 6px
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2, // 10px
    paddingVertical: Spacing.xs + 3, // ~7px
    borderRadius: BorderRadius.full,
    borderWidth: 0.8,
    gap: 4,
  },
  chipText: {
    fontSize: Typography.sizes['13'], // 13px
    fontWeight: Typography.weights.normal,
    lineHeight: 19.5,
  },
});
