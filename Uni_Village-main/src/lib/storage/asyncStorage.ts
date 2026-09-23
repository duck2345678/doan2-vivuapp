/**
 * AsyncStorage Wrapper
 * Type-safe wrapper for AsyncStorage with JSON serialization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys enum for type safety
 */
export const STORAGE_KEYS = {
    USER_PREFERENCES: 'user_preferences',
    THEME: 'theme',
    ONBOARDING_COMPLETED: 'onboarding_completed',
    LAST_SYNC: 'last_sync',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | string;

/**
 * Type-safe AsyncStorage wrapper
 */
export const asyncStorage = {
    /**
     * Get item from storage and parse as JSON
     */
    get: async <T>(key: StorageKey): Promise<T | null> => {
        try {
            const value = await AsyncStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Error reading from AsyncStorage [${key}]:`, error);
            return null;
        }
    },

    /**
     * Set item in storage with JSON serialization
     */
    set: async <T>(key: StorageKey, value: T): Promise<boolean> => {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to AsyncStorage [${key}]:`, error);
            return false;
        }
    },

    /**
     * Remove item from storage
     */
    remove: async (key: StorageKey): Promise<boolean> => {
        try {
            await AsyncStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from AsyncStorage [${key}]:`, error);
            return false;
        }
    },

    /**
     * Clear all storage
     */
    clear: async (): Promise<boolean> => {
        try {
            await AsyncStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing AsyncStorage:', error);
            return false;
        }
    },

    /**
     * Get multiple items
     */
    getMultiple: async <T extends Record<string, unknown>>(
        keys: StorageKey[]
    ): Promise<Partial<T>> => {
        try {
            const pairs = await AsyncStorage.multiGet(keys);
            return pairs.reduce((acc, [key, value]) => {
                if (value) {
                    acc[key as keyof T] = JSON.parse(value);
                }
                return acc;
            }, {} as Partial<T>);
        } catch (error) {
            console.error('Error reading multiple from AsyncStorage:', error);
            return {};
        }
    },

    /**
     * Set multiple items
     */
    setMultiple: async (items: Record<StorageKey, unknown>): Promise<boolean> => {
        try {
            const pairs: [string, string][] = Object.entries(items).map(([key, value]) => [
                key,
                JSON.stringify(value),
            ]);
            await AsyncStorage.multiSet(pairs);
            return true;
        } catch (error) {
            console.error('Error writing multiple to AsyncStorage:', error);
            return false;
        }
    },
};
