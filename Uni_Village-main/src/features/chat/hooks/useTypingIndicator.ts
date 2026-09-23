/**
 * useTypingIndicator hook
 * Debounced typing event sender with auto-timeout
 */
import { useCallback, useEffect, useRef } from 'react';

import type { TypingEvent } from '@/lib/websocket';
import { websocketService } from '@/lib/websocket';
import { useChatStore } from '../store';

const TYPING_DEBOUNCE_MS = 300;
const TYPING_TIMEOUT_MS = 3000;

/**
 * Hook for managing typing indicator with debounce and auto-cleanup
 * @param conversationId - Current conversation ID
 */
export function useTypingIndicator(conversationId: string | undefined) {
    const { setTypingUser, typingUsers } = useChatStore();

    // Refs for debounce and timeout
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingSentRef = useRef(false);
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

    /**
     * Send typing event with debounce
     */
    const sendTyping = useCallback(() => {
        if (!conversationId || !websocketService.isConnected()) return;

        // Clear existing debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Debounce the typing event
        debounceTimerRef.current = setTimeout(() => {
            // Only send if we haven't already sent "typing = true"
            if (!isTypingSentRef.current) {
                websocketService.sendTypingEvent(conversationId, true);
                isTypingSentRef.current = true;
            }

            // Reset or start the auto-stop timer
            if (autoStopTimerRef.current) {
                clearTimeout(autoStopTimerRef.current);
            }

            autoStopTimerRef.current = setTimeout(() => {
                if (isTypingSentRef.current) {
                    websocketService.sendTypingEvent(conversationId, false);
                    isTypingSentRef.current = false;
                }
            }, TYPING_TIMEOUT_MS);
        }, TYPING_DEBOUNCE_MS);
    }, [conversationId]);

    /**
     * Stop typing immediately (call when user sends message or leaves input)
     */
    const stopTyping = useCallback(() => {
        if (!conversationId) return;

        // Clear all timers
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
        }

        // Send stop typing if we had sent start
        if (isTypingSentRef.current && websocketService.isConnected()) {
            websocketService.sendTypingEvent(conversationId, false);
            isTypingSentRef.current = false;
        }
    }, [conversationId]);

    /**
     * Handle incoming typing events
     */
    const handleTypingEvent = useCallback(
        (event: TypingEvent) => {
            setTypingUser(event.userId, event.userName, event.isTyping);
        },
        [setTypingUser]
    );

    // Subscribe to typing events
    useEffect(() => {
        if (!conversationId || !websocketService.isConnected()) {
            return;
        }

        const subscription = websocketService.subscribeToTyping(
            conversationId,
            handleTypingEvent
        );

        subscriptionRef.current = subscription;

        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
        };
    }, [conversationId, handleTypingEvent]);

    // Cleanup on unmount or conversation change
    useEffect(() => {
        return () => {
            stopTyping();
        };
    }, [stopTyping]);

    // Get typing users list (excluding stale entries)
    const typingUsersList = Array.from(typingUsers.values()).filter((user) => {
        // Remove typing users older than TYPING_TIMEOUT_MS
        return Date.now() - user.timestamp < TYPING_TIMEOUT_MS;
    });

    return {
        /** Call this on text input change */
        sendTyping,
        /** Call this when user sends a message or blurs input */
        stopTyping,
        /** List of currently typing users */
        typingUsers: typingUsersList,
        /** True if anyone is typing */
        isAnyoneTyping: typingUsersList.length > 0,
        /** Formatted typing indicator text */
        typingText: getTypingText(typingUsersList),
    };
}

/**
 * Format typing indicator text
 */
function getTypingText(
    typingUsers: Array<{ userId: number; userName: string }>
): string {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0].userName} đang nhập...`;
    if (typingUsers.length === 2) {
        return `${typingUsers[0].userName} và ${typingUsers[1].userName} đang nhập...`;
    }
    return `${typingUsers[0].userName} và ${typingUsers.length - 1} người khác đang nhập...`;
}
