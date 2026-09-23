/**
 * useThemeColor Hook
 * Get color value based on current theme
 */

import { Colors } from '@/shared/constants/theme';
import { useColorScheme } from './useColorScheme';

export function useThemeColor(
    props: { light?: string; dark?: string },
    colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
    const colorScheme = useColorScheme();
    const colorFromProps = props[colorScheme];

    if (colorFromProps) {
        return colorFromProps;
    }
    return Colors[colorScheme][colorName];
}
