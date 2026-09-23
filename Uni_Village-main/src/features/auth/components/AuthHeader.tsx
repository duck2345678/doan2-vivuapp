/**
 * AuthHeader Component
 * Logo and title for auth screens
 */

import { Colors } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface AuthHeaderProps {
    title: string;
}

export function AuthHeader({ title }: AuthHeaderProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={styles.container}>
            <Image
                source={require('@/assets/images/univillage-logo.png')}
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.authTitleText }]}>
                {title}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 32,
    },
    logo: {
        width: 128,
        height: 128,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
    },
});
