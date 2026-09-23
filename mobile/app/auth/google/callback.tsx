/**
 * Google OAuth Callback Handler
 * This route handles the deep link callback from Google OAuth
 * URL: univillage://auth/google/callback?access_token=...&refresh_token=...
 */

import { env } from '@/config/env';
import type { User } from '@/features/auth';
import { useAuthStore } from '@/features/auth';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function GoogleCallbackScreen() {
    const params = useLocalSearchParams<{
        access_token?: string;
        refresh_token?: string;
    }>();
    const [error, setError] = useState<string | null>(null);
    const { setTokens, setUser } = useAuthStore();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const accessToken = params.access_token;
                const refreshToken = params.refresh_token;

                if (!accessToken || !refreshToken) {
                    setError('Không nhận được token từ server');
                    setTimeout(() => router.replace('/(auth)/login'), 2000);
                    return;
                }

                // Save tokens
                setTokens({ accessToken, refreshToken });

                // Fetch user profile
                const response = await fetch(`${env.API_URL}/api/v1/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Không thể lấy thông tin người dùng');
                }

                const profileData = await response.json();
                const result = profileData.result || profileData;

                const user: User = {
                    id: result.userId || result.id,
                    userId: result.userId || result.id,
                    username: result.username || '',
                    displayName: result.displayName || result.username || '',
                    email: result.email || '',
                    avatarUrl: result.avatarUrl,
                    bio: result.bio,
                    createdAt: result.createdAt || new Date().toISOString(),
                    updatedAt: result.updatedAt || new Date().toISOString(),
                };

                setUser(user);

                // Navigate to main app
                router.replace('/(tabs)/map');
            } catch (err: any) {
                console.error('[GoogleCallback] Error:', err);
                setError(err.message || 'Đăng nhập thất bại');
                setTimeout(() => router.replace('/(auth)/login'), 2000);
            }
        };

        handleCallback();
    }, [params.access_token, params.refresh_token, setTokens, setUser]);

    return (
        <View style={styles.container}>
            {error ? (
                <>
                    <Text style={styles.errorText}>{error}</Text>
                    <Text style={styles.redirectText}>Đang chuyển hướng...</Text>
                </>
            ) : (
                <>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Đang đăng nhập...</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginBottom: 8,
    },
    redirectText: {
        fontSize: 14,
        color: '#999',
    },
});
