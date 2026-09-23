/**
 * Post Detail Route
 * Displays a single post with comments
 */

import { useLocalSearchParams } from 'expo-router';

import { PostDetailScreen } from '@/features/post';

export default function PostDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <PostDetailScreen postId={id} />;
}
