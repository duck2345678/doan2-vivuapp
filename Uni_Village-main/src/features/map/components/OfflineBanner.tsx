/**
 * OfflineBanner Component
 *
 * Displays a warning banner when device is offline
 * Shows limited functionality message with retry option
 */

import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface OfflineBannerProps {
    /** Custom message to display */
    message?: string;
    /** Whether to show retry button */
    showRetry?: boolean;
    /** Callback when retry is pressed */
    onRetry?: () => void;
}

const OfflineBannerComponent: React.FC<OfflineBannerProps> = ({
    message = 'Bạn đang offline. Một số tính năng có thể bị hạn chế.',
    showRetry = true,
    onRetry,
}) => {
    const insets = useSafeAreaInsets();
    const { isConnected, isInternetReachable, refresh, isLoading } = useNetworkStatus();

    const isOffline = !isConnected || isInternetReachable === false;

    const handleRetry = useCallback(async () => {
        await refresh();
        onRetry?.();
    }, [refresh, onRetry]);

    if (!isOffline) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                { paddingTop: insets.top > 0 ? insets.top + 4 : 12 },
            ]}
        >
            <View style={styles.content}>
                <Ionicons name="cloud-offline" size={20} color="#FFF" />
                <Text style={styles.message} numberOfLines={2}>
                    {message}
                </Text>
            </View>
            {showRetry && (
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetry}
                    disabled={isLoading}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isLoading ? 'sync' : 'refresh'}
                        size={18}
                        color="#FFF"
                        style={isLoading ? styles.spinning : undefined}
                    />
                    <Text style={styles.retryText}>
                        {isLoading ? 'Đang kiểm tra...' : 'Thử lại'}
                    </Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#EF4444',
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    message: {
        flex: 1,
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    retryText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    spinning: {
        // Note: Add rotation animation if needed
    },
});

export const OfflineBanner = memo(OfflineBannerComponent);
