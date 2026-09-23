/**
 * Auth Store
 * Zustand store for authentication state
 */

import { secureStorage } from '@/lib/storage';
import { create } from 'zustand';
import type { AuthState, AuthTokens, User } from '../types';

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'auth_access_token',
    REFRESH_TOKEN: 'auth_refresh_token',
    USER: 'auth_user',
} as const;

interface AuthStore extends AuthState {
    // Actions
    setUser: (user: User | null) => void;
    setTokens: (tokens: AuthTokens) => void;
    clear: () => Promise<void>;
    hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    // Initial state
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,

    // Actions
    setUser: (user) => {
        const { accessToken, refreshToken } = get();
        set({ user, isAuthenticated: !!accessToken || !!refreshToken || !!user });
        if (user) {
            secureStorage.setJson(STORAGE_KEYS.USER, user);
        } else {
            secureStorage.remove(STORAGE_KEYS.USER);
        }
    },

    setTokens: (tokens) => {
        set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
        });
        secureStorage.set(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        secureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    },

    clear: async () => {
        set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
        });
        await Promise.all([
            secureStorage.remove(STORAGE_KEYS.ACCESS_TOKEN),
            secureStorage.remove(STORAGE_KEYS.REFRESH_TOKEN),
            secureStorage.remove(STORAGE_KEYS.USER),
        ]);
    },

    hydrate: async () => {
        try {
            const [accessToken, refreshToken, user] = await Promise.all([
                secureStorage.get(STORAGE_KEYS.ACCESS_TOKEN),
                secureStorage.get(STORAGE_KEYS.REFRESH_TOKEN),
                secureStorage.getJson<User>(STORAGE_KEYS.USER),
            ]);

            set({
                accessToken,
                refreshToken,
                user,
                isAuthenticated: !!accessToken && !!user,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to hydrate auth state:', error);
            set({ isLoading: false });
        }
    },
}));
