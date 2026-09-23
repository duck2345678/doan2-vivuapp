/**
 * PostDetailMedia Component
 * Large post image with lightbox viewer
 */

import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PostMediaLightbox } from '@/shared/components/post';
import { BorderRadius, Shadows, Spacing, Typography } from '@/shared/constants';

interface PostDetailMediaProps {
  mediaUrls: string[];
}

export function PostDetailMedia({ mediaUrls }: PostDetailMediaProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const urls = useMemo(() => mediaUrls.filter(Boolean), [mediaUrls]);
  const primaryUrl = urls[0];

  const handleOpenViewer = useCallback(() => {
    if (urls.length > 0) {
      setIsViewerOpen(true);
    }
  }, [urls.length]);

  const handleCloseViewer = useCallback(() => {
    setIsViewerOpen(false);
  }, []);

  if (!primaryUrl) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <Pressable onPress={handleOpenViewer}>
          <Image
            source={{ uri: primaryUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          />
          {urls.length > 1 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {urls.length} photos
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <PostMediaLightbox
        isOpen={isViewerOpen}
        mediaUrls={urls}
        initialIndex={0}
        onClose={handleCloseViewer}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.cardPadding - 4, // 12px
    marginTop: Spacing.sm,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.lg + 2, // 14px as per Figma
    ...Shadows.md,
  },
  counterBadge: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  counterText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: '#fff',
  },
});
