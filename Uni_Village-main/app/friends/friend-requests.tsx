/**
 * Friend Requests Route
 */
import { FriendRequestsList } from '@/features/chat/components/FriendRequestsList';
import { Stack } from 'expo-router';
import React from 'react';

export default function FriendRequestsRoute() {
    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Lời mời kết bạn',
                    headerShown: true,
                }}
            />
            <FriendRequestsList />
        </>
    );
}
