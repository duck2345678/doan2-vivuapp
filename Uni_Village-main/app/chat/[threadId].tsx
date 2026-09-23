import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { ChatThreadScreen } from '@/features/chat';

/**
 * Chat thread screen route
 * Route: /chat/[threadId]
 *
 * This is a thin routing layer - all business logic lives in ChatThreadScreen component
 */
export default function ChatThreadRoute() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false, // Using custom ChatHeader
        }}
      />
      <ChatThreadScreen threadId={threadId ?? ''} />
    </>
  );
}
