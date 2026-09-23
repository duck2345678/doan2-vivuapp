/**
 * FileAttachmentThumbnails Component
 * Displays a gallery of image thumbnails for files to be attached to a message
 */
import { Ionicons } from '@expo/vector-icons';
import type { ImagePickerAsset } from 'expo-image-picker';
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface FileAttachmentThumbnailsProps {
  attachments: ImagePickerAsset[];
  onRemove: (uri: string) => void;
}

/**
 * Renders a horizontal list of image attachment thumbnails
 */
export function FileAttachmentThumbnails({
  attachments,
  onRemove,
}: FileAttachmentThumbnailsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  if (attachments.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.borderLight,
        },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gallery}>
          {attachments.map(attachment => (
            <View key={attachment.uri} style={styles.thumbnailContainer}>
              <Image
                source={{ uri: attachment.uri }}
                style={styles.thumbnail}
                accessibilityLabel={`Attachment preview`}
              />
              <Pressable
                onPress={() => onRemove(attachment.uri)}
                style={[
                  styles.removeButton,
                  { backgroundColor: colors.background },
                ]}
                hitSlop={10}
                accessibilityLabel="Remove attachment"
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gallery: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#ccc',
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    borderRadius: 99,
  },
});
