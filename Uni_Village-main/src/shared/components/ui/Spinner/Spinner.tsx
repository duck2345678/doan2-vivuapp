/**
 * Spinner Component
 * Loading spinner with sizes
 */

import { Colors } from '@/shared/constants/theme';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
    size?: SpinnerSize;
    color?: string;
    style?: ViewStyle;
}

const SIZE_MAP: Record<SpinnerSize, 'small' | 'large'> = {
    sm: 'small',
    md: 'small',
    lg: 'large',
};

export function Spinner({ size = 'md', color = Colors.light.tint, style }: SpinnerProps) {
    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={SIZE_MAP[size]} color={color} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
