/**
 * Settings Layout
 * Stack navigator for settings screens with modal presentation
 */

import { Stack } from 'expo-router';

export default function SettingsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen
                name="change-password"
                options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                }}
            />
            <Stack.Screen
                name="language"
                options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                }}
            />
            <Stack.Screen
                name="help"
                options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                }}
            />
            <Stack.Screen name="about" />
        </Stack>
    );
}
