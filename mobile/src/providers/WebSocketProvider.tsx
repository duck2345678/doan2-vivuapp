import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useWebSocketConnection } from '@/features/chat/hooks/useRealtime';
import { useGlobalWebSocketSubscriptions } from '@/features/chat/hooks/useGlobalWebSocketSubscriptions';
import { presenceService } from '@/features/chat/services/presenceService';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';

interface WebSocketContextValue {
    isConnected: boolean;
    isConnecting: boolean;
    error: Error | null;
    connect: () => Promise<void>;
    disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
    children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { isConnected, isConnecting, error, connect, disconnect } = useWebSocketConnection();
    const queryClient = useQueryClient();
    const wasConnectedRef = React.useRef(false);

    useGlobalWebSocketSubscriptions();

    useEffect(() => {
        if (isAuthenticated && !isConnected && !isConnecting) {
            connect().catch((err) => {
                console.error('[WebSocket Provider] Failed to connect:', err);
            });
        }

        if (!isAuthenticated && isConnected) {
            disconnect();
        }
    }, [isAuthenticated, isConnected, isConnecting, connect, disconnect]);

    useEffect(() => {
        if (isConnected) {
            presenceService.initialize();
            
            if (wasConnectedRef.current) {
                console.log('[WebSocket Provider] Reconnected - triggering sync');
                setTimeout(() => {
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.conversations.all,
                    });
                }, 1000);
            }
            
            wasConnectedRef.current = true;
        } else {
            presenceService.cleanup();
        }

        return () => {
            presenceService.cleanup();
        };
    }, [isConnected, queryClient]);

    const value: WebSocketContextValue = {
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
    };

    return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket(): WebSocketContextValue {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
}
