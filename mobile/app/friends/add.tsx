import { Stack } from 'expo-router';
import React from 'react';

import { AddFriendScreen } from '@/features/community/components/AddFriendScreen';

/**
 * Add Friend screen route
 * Route: /friends/add
 *
 * This is a thin routing layer - all business logic lives in AddFriendScreen component
 */
export default function AddFriendRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false, // Using custom header
          presentation: 'modal',
        }}
      />
      <AddFriendScreen />
    </>
  );
}
