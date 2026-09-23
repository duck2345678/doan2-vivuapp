import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BorderRadius, Spacing } from '@/shared/constants';

interface PostMediaProps {
  imageUrl: string;
}

/**
 * Post image/media component
 */
export function PostMedia({ imageUrl }: PostMediaProps) {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.cardPadding,
    marginTop: Spacing.sm,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.lg, // 12px
  },
});
