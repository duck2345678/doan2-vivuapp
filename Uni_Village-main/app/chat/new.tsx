import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

/**
 * New chat/channel creation placeholder screen
 * Route: /chat/new
 */
export default function NewChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tạo tin nhắn mới',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={styles.icon}>✉️</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Tạo tin nhắn mới
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Tính năng tạo tin nhắn mới đang được phát triển.{'\n'}
            Vui lòng quay lại sau!
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  card: {
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
});
