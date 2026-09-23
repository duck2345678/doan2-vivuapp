/**
 * Screen Component
 * Base screen wrapper with safe area and common configuration
 */

import { Colors } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks/useColorScheme';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps {
    children: React.ReactNode;
    scroll?: boolean;
    keyboardAvoiding?: boolean;
    padding?: boolean;
    safeArea?: boolean;
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
}

export function Screen({
    children,
    scroll = false,
    keyboardAvoiding = false,
    padding = true,
    safeArea = true,
    style,
    contentContainerStyle,
}: ScreenProps) {
    const colorScheme = useColorScheme();
    const backgroundColor = Colors[colorScheme ?? 'light'].background;

    let content = children;

    // Wrap in ScrollView if needed
    if (scroll) {
        content = (
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    padding && styles.padding,
                    contentContainerStyle,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {children}
            </ScrollView>
        );
    } else {
        content = (
            <View style={[styles.content, padding && styles.padding, contentContainerStyle]}>
                {children}
            </View>
        );
    }

    // Wrap in KeyboardAvoidingView if needed
    if (keyboardAvoiding) {
        content = (
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {content}
            </KeyboardAvoidingView>
        );
    }

    // Wrap in SafeAreaView or regular View
    if (safeArea) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }, style]}>
                {content}
            </SafeAreaView>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor }, style]}>
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    padding: {
        padding: 16,
    },
});
