import { useEffect, useState } from 'react';
import { presenceService } from '../services';
import { useWebSocket } from '@/providers';

export function useOnlineStatus(userId: number | undefined) {
    const [isOnline, setIsOnline] = useState(false);
    const { isConnected } = useWebSocket();

    useEffect(() => {
        if (!userId) {
            setIsOnline(false);
            return;
        }

        if (!isConnected) {
            setIsOnline(false);
            return;
        }

        const unsubscribe = presenceService.subscribeToUserPresence(userId, (online) => {
            setIsOnline(online);
        });

        return unsubscribe;
    }, [userId, isConnected]);

    return { isOnline };
}

export function useUserPresence(userIds: number[]) {
    const [onlineStatus, setOnlineStatus] = useState<Map<number, boolean>>(new Map());
    const { isConnected } = useWebSocket();

    useEffect(() => {
        if (!isConnected || userIds.length === 0) {
            setOnlineStatus(new Map());
            return;
        }

        const unsubscribers = userIds.map((userId) =>
            presenceService.subscribeToUserPresence(userId, (isOnline) => {
                setOnlineStatus((prev) => {
                    const next = new Map(prev);
                    next.set(userId, isOnline);
                    return next;
                });
            })
        );

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [userIds.join(','), isConnected]);

    return { onlineStatus };
}
