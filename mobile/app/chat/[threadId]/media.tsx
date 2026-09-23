import { SentMediaGalleryScreen } from '@/features/chat';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

/**
 * Sent media gallery screen route
 * Route: /chat/[threadId]/media
 */
export default function SentMediaGalleryRoute() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SentMediaGalleryScreen threadId={threadId ?? ''} />
    </>
  );
}
