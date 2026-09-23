/**
 * useColorScheme Hook
 * Returns the current color scheme (light/dark)
 * User preference from settings store takes full control
 */

import { useSettingsStore } from '@/features/settings/store/settings.store';


export function useColorScheme(): 'light' | 'dark' {
    const darkModeEnabled = useSettingsStore((state) => state.darkMode);

    // User preference fully controls the theme
    return darkModeEnabled ? 'dark' : 'light';
}
