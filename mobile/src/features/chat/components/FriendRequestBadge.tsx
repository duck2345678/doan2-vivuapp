/**
 * FriendRequestBadge Component
 * Red dot badge shown on tabs when friend requests exist
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useIncomingFriendRequests } from '../hooks';

interface FriendRequestBadgeProps {
    /** Children to wrap (typically an icon) */
    children: React.ReactNode;
}

/**
 * Wrapper that shows a red dot when there are pending friend requests
 */
export function FriendRequestBadge({ children }: FriendRequestBadgeProps) {
    const { data } = useIncomingFriendRequests(1); // Only need count

    const totalRequests = data?.pages?.[0]?.totalElements ?? 0;
    const showBadge = totalRequests > 0;

    return (
        <View style={styles.container}>
            {children}
            {showBadge && <View style={styles.badge} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -4,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
});
