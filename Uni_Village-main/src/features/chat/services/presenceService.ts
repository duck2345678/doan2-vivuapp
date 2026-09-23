import type { WebSocketMessage } from '@/lib/websocket';
import { websocketService } from '@/lib/websocket';

interface PresenceEvent {
    userId: number;
    displayName?: string;
    isOnline: boolean;
    lastSeen?: string;
}

class PresenceService {
    private onlineUsers: Set<number> = new Set();
    private presenceCallbacks: Map<number, Set<(isOnline: boolean) => void>> = new Map();
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private presenceSubscription: { unsubscribe: () => void } | null = null;
    private readonly HEARTBEAT_INTERVAL = 30000;

    subscribeToUserPresence(userId: number, callback: (isOnline: boolean) => void): () => void {
        if (!this.presenceCallbacks.has(userId)) {
            this.presenceCallbacks.set(userId, new Set());
        }
        
        this.presenceCallbacks.get(userId)!.add(callback);

        callback(this.onlineUsers.has(userId));

        return () => {
            const callbacks = this.presenceCallbacks.get(userId);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.presenceCallbacks.delete(userId);
                }
            }
        };
    }

    setUserOnline(userId: number): void {
        const wasOffline = !this.onlineUsers.has(userId);
        this.onlineUsers.add(userId);
        
        if (wasOffline) {
            this.notifyPresenceChange(userId, true);
        }
    }

    setUserOffline(userId: number): void {
        const wasOnline = this.onlineUsers.has(userId);
        this.onlineUsers.delete(userId);
        
        if (wasOnline) {
            this.notifyPresenceChange(userId, false);
        }
    }

    isUserOnline(userId: number): boolean {
        return this.onlineUsers.has(userId);
    }

    private notifyPresenceChange(userId: number, isOnline: boolean): void {
        const callbacks = this.presenceCallbacks.get(userId);
        if (callbacks) {
            callbacks.forEach((callback) => callback(isOnline));
        }
    }

    startHeartbeat(): void {
        if (this.heartbeatInterval) {
            return;
        }

        this.sendHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.HEARTBEAT_INTERVAL);

        console.log('[PresenceService] Heartbeat started');
    }

    stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('[PresenceService] Heartbeat stopped');
        }
    }

    private sendHeartbeat(): void {
        if (!websocketService.isConnected()) {
            console.warn('[PresenceService] Cannot send heartbeat: not connected');
            return;
        }

        try {
            websocketService.sendPresenceHeartbeat();
            console.log('[PresenceService] Heartbeat sent');
        } catch (error) {
            console.error('[PresenceService] Failed to send heartbeat:', error);
        }
    }

    subscribeToPresenceEvents(): void {
        if (!websocketService.isConnected()) {
            console.warn('[PresenceService] Cannot subscribe to presence: not connected');
            return;
        }

        if (this.presenceSubscription) {
            return;
        }

        this.presenceSubscription = websocketService.subscribeToPresence((message: WebSocketMessage<any>) => {
            console.log('[PresenceService] Received presence event:', message);

            if (message.eventType === 'USER_ONLINE') {
                const event = message.data as PresenceEvent;
                this.setUserOnline(event.userId);
            } else if (message.eventType === 'USER_OFFLINE') {
                const event = message.data as PresenceEvent;
                this.setUserOffline(event.userId);
            } else if (message.eventType === 'BULK_PRESENCE') {
                const events = message.data as PresenceEvent[];
                events.forEach((event) => {
                    if (event.isOnline) {
                        this.setUserOnline(event.userId);
                    } else {
                        this.setUserOffline(event.userId);
                    }
                });
                console.log(`[PresenceService] Processed bulk presence update: ${events.length} users`);
            }
        });

        console.log('[PresenceService] Subscribed to presence events');
    }

    unsubscribeFromPresenceEvents(): void {
        if (this.presenceSubscription) {
            this.presenceSubscription.unsubscribe();
            this.presenceSubscription = null;
            console.log('[PresenceService] Unsubscribed from presence events');
        }
    }

    initialize(): void {
        if (!websocketService.isConnected()) {
            console.warn('[PresenceService] Cannot initialize: not connected');
            return;
        }

        this.subscribeToPresenceEvents();
        this.startHeartbeat();
        console.log('[PresenceService] Initialized');
    }

    cleanup(): void {
        this.stopHeartbeat();
        this.unsubscribeFromPresenceEvents();
        this.onlineUsers.clear();
        console.log('[PresenceService] Cleaned up');
    }

    clear(): void {
        this.cleanup();
        this.presenceCallbacks.clear();
    }
}

export const presenceService = new PresenceService();
