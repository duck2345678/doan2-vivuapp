import { CreatePostScreen } from '@/features/post/screens/CreatePostScreen';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function EditPostRoute() {
    const params = useLocalSearchParams<{ postId?: string }>();

    if (!params.postId) {
        return null;
    }

    return <CreatePostScreen postId={params.postId} initialTab="post" />;
}
