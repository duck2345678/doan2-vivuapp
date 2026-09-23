/**
 * Secure Storage Wrapper
 * Type-safe wrapper for expo-secure-store for sensitive data
 */

import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage keys for sensitive data
 */
export const SECURE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_ID: 'user_id',
    BIOMETRIC_KEY: 'biometric_key',
} as const;

type SecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS] | string;

/**
 * Type-safe SecureStore wrapper
 */
export const secureStorage = {
    /**
     * Get item from secure storage
     */
    get: async (key: SecureKey): Promise<string | null> => {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (error) {
            console.error(`Error reading from SecureStore [${key}]:`, error);
            return null;
        }
    },

    /**
     * Get and parse JSON from secure storage
     */
    getJson: async <T>(key: SecureKey): Promise<T | null> => {
        try {
            const value = await SecureStore.getItemAsync(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Error reading JSON from SecureStore [${key}]:`, error);
            return null;
        }
    },

    /**
     * Set item in secure storage
     */
    set: async (key: SecureKey, value: string): Promise<boolean> => {
        try {
            await SecureStore.setItemAsync(key, value);
            return true;
        } catch (error) {
            console.error(`Error writing to SecureStore [${key}]:`, error);
            return false;
        }
    },

    /**
     * Set JSON value in secure storage
     */
    setJson: async <T>(key: SecureKey, value: T): Promise<boolean> => {
        try {
            await SecureStore.setItemAsync(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing JSON to SecureStore [${key}]:`, error);
            return false;
        }
    },

    /**
     * Remove item from secure storage
     */
    remove: async (key: SecureKey): Promise<boolean> => {
        try {
            await SecureStore.deleteItemAsync(key);
            return true;
        } catch (error) {
            console.error(`Error removing from SecureStore [${key}]:`, error);
            return false;
        }
    },

    /**
     * Clear all secure tokens (for logout)
     */
    clearTokens: async (): Promise<boolean> => {
        try {
            await Promise.all([
                SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN),
                SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN),
            ]);
            return true;
        } catch (error) {
            console.error('Error clearing tokens from SecureStore:', error);
            return false;
        }
    },
};
