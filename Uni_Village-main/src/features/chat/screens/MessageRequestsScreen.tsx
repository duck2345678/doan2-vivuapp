/**
 * MessageRequestsScreen
 * Full screen for viewing message requests from non-friends
 */
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import { MessageRequestItem } from '../components/MessageRequestItem';
import { useMessageRequestsList } from '../hooks';
import type { MessageRequestPreview } from '../store';

/**
 * Screen displaying all message requests
 */
export function MessageRequestsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const router = useRouter();

    const { messageRequests, count, hasRequests } = useMessageRequestsList();

    const handleGoBack = () => {
        router.back();
    };

    const renderItem = useCallback(({ item }: { item: MessageRequestPreview }) => (
        <MessageRequestItem request={item} />
    ), []);

    const keyExtractor = useCallback((item: MessageRequestPreview) =>
        item.conversationId,
        []);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Không có tin nhắn đang chờ
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tin nhắn từ người lạ sẽ xuất hiện ở đây
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Pressable
                    style={styles.backButton}
                    onPress={handleGoBack}
                    hitSlop={12}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>

                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        Tin nhắn đang chờ
                    </Text>
                    {hasRequests && (
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            {count} yêu cầu
                        </Text>
                    )}
                </View>

                {/* Placeholder for symmetry */}
                <View style={styles.backButton} />
            </View>

            {/* Info Banner */}
            <View style={[styles.infoBanner, { backgroundColor: colors.card }]}>
                <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Đây là tin nhắn từ những người chưa phải bạn bè. Chấp nhận để trả lời.
                </Text>
            </View>

            {/* Content */}
            <FlashList<MessageRequestPreview>
                data={messageRequests}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                estimatedItemSize={88}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
    },
    headerSubtitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.normal,
        marginTop: 2,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        margin: Spacing.md,
        borderRadius: 8,
        gap: Spacing.sm,
    },
    infoText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        lineHeight: 18,
    },
    listContent: {
        paddingBottom: Spacing.lg,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing['2xl'] * 2,
        paddingHorizontal: Spacing.lg,
    },
    emptyTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: Typography.sizes.base,
        textAlign: 'center',
    },
});
