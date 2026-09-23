/**
 * useGoogleAuth Hook
 * Handles Google OAuth authentication flow using expo-auth-session
 */

import { env } from '@/config/env';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

// Ensure browser auth sessions are completed properly
WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthState {
    isLoading: boolean;
    error: string | null;
}

export function useGoogleAuth() {
    const [state, setState] = useState<GoogleAuthState>({
        isLoading: false,
        error: null,
    });

    const { setTokens, setUser } = useAuthStore();

    // Create redirect URI for the app
    const redirectUri = 'univillage://auth/google/callback';

    // Backend OAuth2 URL
    const backendOAuthUrl = `${env.API_URL}/oauth2/authorization/google`;

    /**
     * Handle the OAuth callback with tokens from URL
     */
    const handleOAuthCallback = useCallback(async (url: string) => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            // Parse URL to extract tokens
            const parsedUrl = new URL(url);
            const accessToken = parsedUrl.searchParams.get('access_token');
            const refreshToken = parsedUrl.searchParams.get('refresh_token');

            if (!accessToken || !refreshToken) {
                throw new Error('Không nhận được token từ server');
            }

            // Save tokens to store
            setTokens({
                accessToken,
                refreshToken,
            });

            // Fetch user profile with the new token
            const profileResponse = await fetch(`${env.API_URL}/api/v1/users/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!profileResponse.ok) {
                throw new Error('Không thể lấy thông tin người dùng');
            }

            const profileData = await profileResponse.json();
            const result = profileData.result || profileData;
            
            // Map profile to user with proper User type
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

            setState(prev => ({ ...prev, isLoading: false }));

            // Navigate to main app
            router.replace('/(tabs)/map');

            return { success: true };
        } catch (error: any) {
            console.error('[GoogleAuth] Callback error:', error);
            setState(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: error.message || 'Đăng nhập Google thất bại' 
            }));
            Alert.alert('Lỗi', error.message || 'Đăng nhập Google thất bại');
            return { success: false, error: error.message };
        }
    }, [setTokens, setUser]);

    /**
     * Start Google OAuth flow by opening browser
     */
    const signInWithGoogle = useCallback(async () => {
        try {
            setState({ isLoading: true, error: null });

            console.log('[GoogleAuth] Starting OAuth flow');
            console.log('[GoogleAuth] Backend URL:', backendOAuthUrl);
            console.log('[GoogleAuth] Redirect URI:', redirectUri);

            // Open browser to backend OAuth endpoint
            const result = await WebBrowser.openAuthSessionAsync(
                backendOAuthUrl,
                redirectUri,
                {
                    showInRecents: true,
                    preferEphemeralSession: false,
                }
            );

            console.log('[GoogleAuth] WebBrowser result:', result);

            if (result.type === 'success' && result.url) {
                // Handle the callback URL
                await handleOAuthCallback(result.url);
            } else if (result.type === 'cancel') {
                setState({ isLoading: false, error: null });
                console.log('[GoogleAuth] User cancelled');
            } else {
                setState({ 
                    isLoading: false, 
                    error: 'Đăng nhập bị hủy hoặc thất bại' 
                });
            }
        } catch (error: any) {
            console.error('[GoogleAuth] Sign in error:', error);
            setState({ 
                isLoading: false, 
                error: error.message || 'Không thể kết nối đến Google' 
            });
            Alert.alert('Lỗi', 'Không thể kết nối đến Google. Vui lòng thử lại.');
        }
    }, [backendOAuthUrl, redirectUri, handleOAuthCallback]);

    /**
     * Listen for deep link callbacks (fallback)
     */
    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            console.log('[GoogleAuth] Deep link received:', event.url);
            if (event.url.includes('auth/google/callback')) {
                handleOAuthCallback(event.url);
            }
        };

        // Listen for deep links
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Check if app was opened with a URL
        Linking.getInitialURL().then((url) => {
            if (url && url.includes('auth/google/callback')) {
                handleOAuthCallback(url);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [handleOAuthCallback]);

    return {
        signInWithGoogle,
        isLoading: state.isLoading,
        error: state.error,
    };
}
