import { PublicProfileScreen } from '@/features/profile';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

/**
 * Public profile screen route
 * Route: /profile/[userId]
 */
export default function PublicProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  // Parse userId from URL param (string) to number
  const userIdNumber = userId ? parseInt(userId, 10) : undefined;

  if (!userIdNumber || isNaN(userIdNumber)) {
    return null; // Or show error screen
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PublicProfileScreen userId={userIdNumber} />
    </>
  );
}
