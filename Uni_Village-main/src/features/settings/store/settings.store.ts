/**
 * Settings Store
 * Zustand store for app settings state with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import i18n from '@/lib/i18n';

export type LanguageCode = 'vi' | 'en';

interface SettingsState {
    darkMode: boolean;
    privatePosts: boolean;
    language: LanguageCode;
}

interface SettingsActions {
    setDarkMode: (value: boolean) => void;
    setPrivatePosts: (value: boolean) => void;
    setLanguage: (value: LanguageCode) => void;
    toggleDarkMode: () => void;
    togglePrivatePosts: () => void;
}

interface SettingsStore extends SettingsState, SettingsActions { }

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            // Initial state
            darkMode: false,
            privatePosts: false,
            language: 'vi',

            // Actions
            setDarkMode: (value) => set({ darkMode: value }),
            setPrivatePosts: (value) => set({ privatePosts: value }),
            setLanguage: (value) => {
                i18n.changeLanguage(value);
                set({ language: value });
            },
            toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
            togglePrivatePosts: () => set((state) => ({ privatePosts: !state.privatePosts })),
        }),
        {
            name: 'uni-village-settings',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                if (state) {
                   i18n.changeLanguage(state.language);
                }
            },
        }
    )
);
