import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface MessagesSearchRowProps {
  value: string;
  onChangeText: (text: string) => void;
  onPressCreate?: (x: number, y: number) => void;
}

/**
 * Search input with FAB button for Messages section
 * Matches Figma node 204:537 design
 */
export function MessagesSearchRow({
  value,
  onChangeText,
  onPressCreate,
}: MessagesSearchRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const fabRef = useRef<View>(null);

  const handleFabPress = () => {
    if (fabRef.current && onPressCreate) {
      fabRef.current.measureInWindow((x, y, width, height) => {
        // Pass center-bottom of FAB as anchor
        onPressCreate(x + width / 2, y + height);
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.chipBackground,
          },
        ]}
      >
        <MaterialIcons
          name="search"
          size={20}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[
            styles.searchInput,
            {
              color: colors.text,
            },
          ]}
          placeholder="Tìm kiếm..."
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="close"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Create Button (FAB) */}
      <TouchableOpacity
        ref={fabRef}
        style={[styles.fabButton, { backgroundColor: colors.fabBlue }]}
        onPress={handleFabPress}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.sm,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  fabButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
});
