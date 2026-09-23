/**
 * FriendRequestItem Component
 * Row component for friend requests with optimistic updates
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/shared/components/ui';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { formatRelativeTime } from '@/shared/utils';

import type { FriendRequestItem as FriendRequestItemType } from '../api/friends.api';
import { useFriendActions } from '../hooks';

interface FriendRequestItemProps {
    request: FriendRequestItemType;
    type: 'incoming' | 'outgoing';
    /** Called when item should be hidden (optimistic) */
    onHide?: (userId: number) => void;
    /** Called when item should reappear (on error) */
    onShow?: (userId: number) => void;
}

/**
 * Friend request row with optimistic updates
 * Item hides immediately on action, reappears on error
 */
export function FriendRequestItem({ request, type, onHide, onShow }: FriendRequestItemProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const { user, createdAt } = request;

    const [isHidden, setIsHidden] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const {
        acceptRequest,
        declineRequest,
        cancelRequest,
    } = useFriendActions();

    // Hide during optimistic update
    if (isHidden) {
        return null;
    }

    const handleAccept = async () => {
        setIsHidden(true);
        onHide?.(user.id);

        try {
            await acceptRequest.mutateAsync(user.id);
        } catch {
            setIsHidden(false);
            onShow?.(user.id);
            Alert.alert('Lỗi', 'Không thể chấp nhận lời mời. Vui lòng thử lại.');
        }
    };

    const handleDecline = async () => {
        setIsHidden(true);
        onHide?.(user.id);

        try {
            await declineRequest.mutateAsync(user.id);
        } catch {
            setIsHidden(false);
            onShow?.(user.id);
            Alert.alert('Lỗi', 'Không thể từ chối lời mời. Vui lòng thử lại.');
        }
    };

    const handleCancel = async () => {
        setIsHidden(true);
        onHide?.(user.id);

        try {
            await cancelRequest.mutateAsync(user.id);
        } catch {
            setIsHidden(false);
            onShow?.(user.id);
            Alert.alert('Lỗi', 'Không thể hủy lời mời. Vui lòng thử lại.');
        }
    };

    const isLoading = loadingAction !== null;

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <Avatar source={user.avatarUrl} name={user.displayName} size="lg" />

            <View style={styles.content}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                    {user.displayName}
                </Text>
                {user.username && (
                    <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                        @{user.username}
                    </Text>
                )}
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                    {formatRelativeTime(createdAt)}
                </Text>
            </View>

            <View style={styles.actions}>
                {type === 'incoming' ? (
                    <>
                        <Pressable
                            style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.tint }]}
                            onPress={handleAccept}
                            disabled={isLoading}
                            accessibilityLabel="Chấp nhận lời mời kết bạn"
                        >
                            {loadingAction === 'accept' ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                            )}
                        </Pressable>
                        <Pressable
                            style={[styles.actionButton, styles.declineButton, { borderColor: colors.border }]}
                            onPress={handleDecline}
                            disabled={isLoading}
                            accessibilityLabel="Từ chối lời mời kết bạn"
                        >
                            {loadingAction === 'decline' ? (
                                <ActivityIndicator size="small" color={colors.textSecondary} />
                            ) : (
                                <Ionicons name="close" size={18} color={colors.textSecondary} />
                            )}
                        </Pressable>
                    </>
                ) : (
                    <Pressable
                        style={[styles.cancelButton, { borderColor: colors.border }]}
                        onPress={handleCancel}
                        disabled={isLoading}
                        accessibilityLabel="Hủy lời mời kết bạn"
                    >
                        {loadingAction === 'cancel' ? (
                            <ActivityIndicator size="small" color={colors.textSecondary} />
                        ) : (
                            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                                Hủy
                            </Text>
                        )}
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    content: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    name: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        lineHeight: 22,
    },
    username: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.normal,
        lineHeight: 18,
    },
    time: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.normal,
        lineHeight: 16,
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptButton: {
        // backgroundColor set dynamically
    },
    declineButton: {
        borderWidth: 1.5,
        backgroundColor: 'transparent',
    },
    cancelButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    cancelText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
});
