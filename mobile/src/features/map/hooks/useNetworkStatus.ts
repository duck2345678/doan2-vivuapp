/**
 * useNetworkStatus Hook
 *
 * Detects network connectivity status and provides:
 * - Real-time online/offline state
 * - Connection type info (when available)
 * - Automatic re-check capability
 */

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';

export interface NetworkStatus {
    /** Whether device is connected to internet */
    isConnected: boolean;
    /** Whether connection can reach internet (not just local network) */
    isInternetReachable: boolean | null;
    /** Connection type: wifi, cellular, etc. */
    connectionType: NetInfoStateType;
    /** Whether network status is still being determined */
    isLoading: boolean;
}

export interface UseNetworkStatusResult extends NetworkStatus {
    /** Manually refresh network status */
    refresh: () => Promise<void>;
}

/**
 * Hook to monitor network connectivity status
 * Uses NetInfo for cross-platform network detection
 */
export function useNetworkStatus(): UseNetworkStatusResult {
    const [status, setStatus] = useState<NetworkStatus>({
        isConnected: true,
        isInternetReachable: null,
        connectionType: NetInfoStateType.unknown,
        isLoading: true,
    });

    const updateStatus = useCallback((state: NetInfoState) => {
        setStatus({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable,
            connectionType: state.type,
            isLoading: false,
        });
    }, []);

    const refresh = useCallback(async () => {
        setStatus((prev) => ({ ...prev, isLoading: true }));
        const state = await NetInfo.fetch();
        updateStatus(state);
    }, [updateStatus]);

    useEffect(() => {
        // Initial fetch
        NetInfo.fetch().then(updateStatus);

        // Subscribe to changes
        const unsubscribe = NetInfo.addEventListener(updateStatus);

        return () => {
            unsubscribe();
        };
    }, [updateStatus]);

    return {
        ...status,
        refresh,
    };
}

/**
 * Simplified hook that just returns online status
 */
export function useIsOnline(): boolean {
    const { isConnected, isInternetReachable } = useNetworkStatus();

    // Consider online if connected and internet is reachable (or unknown)
    return isConnected && (isInternetReachable !== false);
}
