import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface CommunitySearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/**
 * Search bar for filtering posts
 */
export function CommunitySearchBar({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm bài viết...',
}: CommunitySearchBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View testID="community-search" style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <MaterialIcons
          name="search"
          size={20}
          color={colors.textSecondary}
          style={styles.icon}
        />
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={`${colors.text}80`} // 50% opacity
          returnKeyType="search"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.base, // 16px
    paddingVertical: 0,
  },
});
