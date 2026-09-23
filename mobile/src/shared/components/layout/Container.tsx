/**
 * Container Component
 * Centered content container with max width
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

export interface ContainerProps {
    children: React.ReactNode;
    centered?: boolean;
    style?: ViewStyle;
}

export function Container({ children, centered = false, style }: ContainerProps) {
    return (
        <View style={[styles.container, centered && styles.centered, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
