import { useRouter } from 'expo-router';
import { useState } from 'react';

import { conversationsApi } from '../api';
import type { RelationshipStatus } from '../api/friends.api';

export function useNavigateToChat() {
    const router = useRouter();
    const [isNavigating, setIsNavigating] = useState(false);

    const handleNavigateToUser = async (
        userId: number,
        relationshipStatus?: RelationshipStatus
    ) => {
        if (isNavigating) return;

        try {
            setIsNavigating(true);

            let threadId = `user-${userId}`;

            try {
                // Try to find existing conversation ID (even if deleted)
                const response = await conversationsApi.getOrCreateDirect(userId);
                if (response.result && response.result.conversationId) {
                    threadId = response.result.conversationId;
                }
            } catch (apiError) {
                // Network error or other issue - fallback to virtual thread
                console.warn('[useNavigateToChat] Failed to resolve conversation ID:', apiError);
            }

            router.push(`/chat/${threadId}` as any);
        } catch (error) {
            console.error('[useNavigateToChat] Error navigating to chat:', error);
        } finally {
            setIsNavigating(false);
        }
    };

    return {
        handleNavigateToUser,
        isNavigating,
    };
}
