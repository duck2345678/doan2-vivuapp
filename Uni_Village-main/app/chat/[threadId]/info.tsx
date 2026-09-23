import { ThreadInfoScreen } from '@/features/chat';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

/**
 * Chat thread info screen route
 * Route: /chat/[threadId]/info
 */
export default function ThreadInfoRoute() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThreadInfoScreen threadId={threadId ?? ''} />
    </>
  );
}
