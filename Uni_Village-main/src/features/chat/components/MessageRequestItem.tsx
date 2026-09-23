/**
 * MessageRequestItem Component
 * Row component for message requests with optimistic updates
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/shared/components/ui';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { formatRelativeTime } from '@/shared/utils';

import { useMessageRequestActions } from '../hooks';
import type { MessageRequestPreview } from '../store';

interface MessageRequestItemProps {
    request: MessageRequestPreview;
    /** Called when item should be hidden (optimistic) */
    onHide?: (conversationId: string) => void;
    /** Called when item should reappear (on error) */
    onShow?: (conversationId: string) => void;
}

/**
 * Message request row with optimistic updates
 */
export function MessageRequestItem({ request, onHide, onShow }: MessageRequestItemProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const router = useRouter();

    const [isHidden, setIsHidden] = useState(false);
    const { accept, decline, isAccepting, isDeleting } = useMessageRequestActions();

    if (isHidden) {
        return null;
    }

    const handlePress = () => {
        router.push(`/chat/${request.conversationId}`);
    };

    const handleAccept = async () => {
        setIsHidden(true);
        onHide?.(request.conversationId);

        try {
            await accept(request.conversationId);
        } catch {
            setIsHidden(false);
            onShow?.(request.conversationId);
            Alert.alert('Lỗi', 'Không thể chấp nhận tin nhắn. Vui lòng thử lại.');
        }
    };

    const handleDelete = async () => {
        setIsHidden(true);
        onHide?.(request.conversationId);

        try {
            await decline(request.conversationId);
        } catch {
            setIsHidden(false);
            onShow?.(request.conversationId);
            Alert.alert('Lỗi', 'Không thể xóa tin nhắn. Vui lòng thử lại.');
        }
    };

    const isLoading = isAccepting || isDeleting;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                { backgroundColor: colors.card },
                pressed && styles.pressed,
            ]}
            onPress={handlePress}
            disabled={isLoading}
        >
            <View style={styles.avatarContainer}>
                <Avatar source={request.senderAvatarUrl} name={request.senderName} size="lg" />
                {request.unreadCount > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
                        <Text style={styles.unreadText}>
                            {request.unreadCount > 99 ? '99+' : request.unreadCount}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                        {request.senderName}
                    </Text>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>
                        {formatRelativeTime(request.lastMessageTime)}
                    </Text>
                </View>
                <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={2}>
                    {request.lastMessagePreview}
                </Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.actions}>
                <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.tint }]}
                    onPress={handleAccept}
                    disabled={isLoading}
                    hitSlop={8}
                >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </Pressable>
                <Pressable
                    style={[styles.actionButton, styles.deleteButton, { borderColor: colors.border }]}
                    onPress={handleDelete}
                    disabled={isLoading}
                    hitSlop={8}
                >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                </Pressable>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    pressed: {
        opacity: 0.7,
    },
    avatarContainer: {
        position: 'relative',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    unreadText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    name: {
        flex: 1,
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        lineHeight: 22,
        marginRight: Spacing.sm,
    },
    time: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.normal,
    },
    preview: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.normal,
        lineHeight: 18,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginLeft: Spacing.sm,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
});
