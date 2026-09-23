/**
 * ConnectionStatusBanner
 * Displays connection status when WebSocket is not connected
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks/useColorScheme';
import { useSocketStatus } from '../store';

export function ConnectionStatusBanner() {
    const socketStatus = useSocketStatus();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const translateY = useRef(new Animated.Value(-50)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const isVisible = socketStatus !== 'connected';

    useEffect(() => {
        if (isVisible) {
            // Slide in
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 10,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Slide out
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: -50,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 10,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isVisible, translateY, opacity]);

    const getStatusConfig = () => {
        switch (socketStatus) {
            case 'connecting':
                return {
                    icon: 'sync-outline' as const,
                    text: 'Đang kết nối...',
                    bgColor: colors.warning,
                };
            case 'disconnected':
                return {
                    icon: 'cloud-offline-outline' as const,
                    text: 'Mất kết nối',
                    bgColor: colors.textSecondary,
                };
            case 'error':
                return {
                    icon: 'alert-circle-outline' as const,
                    text: 'Lỗi kết nối',
                    bgColor: colors.error,
                };
            default:
                return {
                    icon: 'checkmark-circle-outline' as const,
                    text: 'Đã kết nối',
                    bgColor: colors.success,
                };
        }
    };

    const config = getStatusConfig();

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: config.bgColor,
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
            pointerEvents={isVisible ? 'auto' : 'none'}
        >
            <View style={styles.content}>
                <Ionicons
                    name={config.icon}
                    size={16}
                    color="#fff"
                    style={styles.icon}
                />
                <Text style={styles.text}>{config.text}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginRight: 6,
    },
    text: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
});
