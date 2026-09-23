import { Stack } from 'expo-router';
import React from 'react';

/**
 * Channel stack layout for nested channel routes
 */
export default function ChannelLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        />
    );
}
