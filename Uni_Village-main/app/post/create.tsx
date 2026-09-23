import { CreatePostScreen } from '@/features/post/screens/CreatePostScreen';
import type { CreatePostTab } from '@/features/post/types/createPost.types';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

/**
 * Create Post route - modal presentation
 * Renders the feature-based CreatePostScreen with optional initialTab param
 */
export default function CreatePostRoute() {
  const params = useLocalSearchParams<{ initialTab?: CreatePostTab }>();
  return <CreatePostScreen initialTab={params.initialTab} />;
}
