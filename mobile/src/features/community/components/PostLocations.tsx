import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { PostLocation } from '../types';

interface PostLocationsProps {
  locations: PostLocation[];
  onLocationPress?: (location: PostLocation) => void;
}

/**
 * Row of location links with pin icons
 */
export function PostLocations({ locations, onLocationPress }: PostLocationsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  if (locations.length === 0) return null;

  return (
    <View style={styles.container}>
      {locations.map((location, index) => (
        <TouchableOpacity
          key={location.id}
          style={styles.locationItem}
          onPress={() => onLocationPress?.(location)}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="location-on"
            size={16}
            color={colors.actionBlue}
          />
          <Text style={[styles.locationText, { color: colors.actionBlue }]}>
            {location.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.cardPadding,
    marginTop: Spacing.sm,
    gap: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: Typography.sizes.md, // 14px
    fontWeight: Typography.weights.normal,
    lineHeight: 20,
  },
});
