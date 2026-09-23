/**
 * AuthGuard Component
 * Handles auth state hydration and navigation on app startup
 */

import { Colors } from '@/shared';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

export function AuthGuard() {
    const { isLoading, isAuthenticated, hydrate } = useAuthStore();

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Colors.light.tint} />
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/map" />;
    }

    return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.light.background,
    },
});
