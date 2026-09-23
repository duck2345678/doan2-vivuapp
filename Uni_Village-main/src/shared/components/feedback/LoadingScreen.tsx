/**
 * Loading Screen Component
 * Full-screen loading state
 */

import { Colors } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks/useColorScheme';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export interface LoadingScreenProps {
    message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.tint} />
            {message && <Text style={[styles.message, { color: colors.icon }]}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    message: {
        fontSize: 14,
        marginTop: 16,
        textAlign: 'center',
    },
});
