/**
 * Channel Thread Screen
 * Route: /channel/[channelId]
 *
 * Full chat screen for channel conversations with WebSocket real-time updates
 */
import { ChatThreadScreen } from '@/features/chat/components/ChatThreadScreen';
import { useChannel, useChannelByConversation } from '@/features/chat/hooks/useChannels';
import type { MessageEvent } from '@/lib/websocket';
import { websocketService } from '@/lib/websocket';
import { EmptyState } from '@/shared/components/feedback';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ChannelThreadRoute() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const router = useRouter();
    const queryClient = useQueryClient();

    // Get channelId from route params - can be either channelId or conversationId
    const { channelId } = useLocalSearchParams<{ channelId: string }>();

    // Determine if the param is a conversationId (UUID) or channelId (number)
    const isConversationId = channelId?.includes('-');
    const numericChannelId = !isConversationId ? Number(channelId) : undefined;

    // Fetch channel info - supports both channel ID and conversation ID
    const {
        data: channelFromId,
        isLoading: isLoadingById,
        error: errorById,
    } = useChannel(numericChannelId);

    const {
        data: channelFromConversation,
        isLoading: isLoadingByConversation,
        error: errorByConversation,
    } = useChannelByConversation(isConversationId ? channelId : undefined);

    const channel = channelFromId ?? channelFromConversation;
    const isLoading = isLoadingById || isLoadingByConversation;
    const error = errorById || errorByConversation;

    const conversationId = channel?.conversationId;

    // Subscribe to channel WebSocket updates
    useEffect(() => {
        if (!conversationId) return;

        const handleChannelEvent = (message: { body: MessageEvent }) => {
            const event = message.body;
            console.log('[Channel WS] Received event:', event?.type);

            switch (event?.type) {
                case 'CHANNEL_CHANGED':
                    // Invalidate channel queries to refetch
                    if (numericChannelId) {
                        queryClient.invalidateQueries({
                            queryKey: ['channels', 'detail', numericChannelId],
                        });
                    }
                    if (conversationId) {
                        queryClient.invalidateQueries({
                            queryKey: ['channels', 'byConversation', conversationId],
                        });
                    }
                    break;

                case 'MEMBER_JOINED':
                case 'MEMBER_LEFT':
                    // Invalidate members query
                    if (numericChannelId) {
                        queryClient.invalidateQueries({
                            queryKey: ['channels', 'members', numericChannelId],
                        });
                    }
                    break;
            }
        };

        const subscription = websocketService.subscribeToChannel(
            conversationId,
            handleChannelEvent as any
        );

        return () => {
            subscription?.unsubscribe();
        };
    }, [conversationId, numericChannelId, queryClient]);

    const handleBack = () => {
        router.back();
    };

    const handleInfoPress = () => {
        if (channel?.id) {
            router.push(`/channel/${channel.id}/info`);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.header, { backgroundColor: colors.actionBlue }]}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Channel</Text>
                    <View style={styles.menuButton} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.actionBlue} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Đang tải Channel...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (error || !channel) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.header, { backgroundColor: colors.actionBlue }]}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Channel</Text>
                    <View style={styles.menuButton} />
                </View>
                <EmptyState
                    icon="❌"
                    title="Không thể tải Channel"
                    message="Đã xảy ra lỗi. Vui lòng thử lại sau."
                    actionLabel="Quay lại"
                    onAction={handleBack}
                />
            </SafeAreaView>
        );
    }

    // Main chat screen - reuse ChatThreadScreen with conversationId
    if (conversationId) {
        return (
            <ChatThreadScreen threadId={conversationId} />
        );
    }

    // Fallback if no conversationId
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.header, { backgroundColor: colors.actionBlue }]}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{channel?.name ?? 'Channel'}</Text>
                <TouchableOpacity style={styles.menuButton} onPress={handleInfoPress}>
                    <MaterialIcons name="info-outline" size={24} color="#ffffff" />
                </TouchableOpacity>
            </View>
            <EmptyState
                icon="💬"
                title="Chưa có tin nhắn"
                message="Bắt đầu cuộc trò chuyện trong Channel này"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: 14,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        color: '#ffffff',
        flex: 1,
        textAlign: 'center',
    },
    menuButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
    },
    loadingText: {
        fontSize: Typography.sizes.base,
    },
    placeholderDescription: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.normal,
        textAlign: 'center',
    },
});
