/**
 * FriendRequestsList Component
 * Full list with tabs for incoming/outgoing friend requests using FlashList
 */
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import type { FriendRequestItem as FriendRequestItemType } from '../api/friends.api';
import { useIncomingFriendRequests, useOutgoingFriendRequests } from '../hooks';
import { FriendRequestItem } from './FriendRequestItem';

type TabType = 'incoming' | 'outgoing';

/**
 * Friend requests list with incoming/outgoing tabs
 */
export function FriendRequestsList() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const [activeTab, setActiveTab] = useState<TabType>('incoming');

    const incomingQuery = useIncomingFriendRequests();
    const outgoingQuery = useOutgoingFriendRequests();

    const currentQuery = activeTab === 'incoming' ? incomingQuery : outgoingQuery;

    // Flatten pages into single array
    const requests = currentQuery.data?.pages.flatMap(page => page.content) ?? [];

    const handleRefresh = useCallback(() => {
        currentQuery.refetch();
    }, [currentQuery]);

    const handleLoadMore = useCallback(() => {
        if (currentQuery.hasNextPage && !currentQuery.isFetchingNextPage) {
            currentQuery.fetchNextPage();
        }
    }, [currentQuery]);

    const renderItem = useCallback(({ item }: { item: FriendRequestItemType }) => (
        <FriendRequestItem
            request={item}
            type={activeTab}
        />
    ), [activeTab]);

    const keyExtractor = useCallback((item: FriendRequestItemType) =>
        `${activeTab}-${item.user.id}`,
        [activeTab]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {activeTab === 'incoming' ? 'Không có lời mời đến' : 'Không có lời mời đi'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeTab === 'incoming'
                    ? 'Bạn chưa nhận được lời mời kết bạn nào'
                    : 'Bạn chưa gửi lời mời kết bạn nào'}
            </Text>
        </View>
    );

    const renderFooter = () => {
        if (!currentQuery.isFetchingNextPage) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.tint} />
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Tab Bar */}
            <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
                <Pressable
                    style={[
                        styles.tab,
                        activeTab === 'incoming' && { borderBottomColor: colors.tint },
                    ]}
                    onPress={() => setActiveTab('incoming')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'incoming' ? colors.tint : colors.textSecondary },
                    ]}>
                        Lời mời đến
                    </Text>
                    {(incomingQuery.data?.pages[0]?.totalElements ?? 0) > 0 && (
                        <View style={[styles.tabBadge, { backgroundColor: colors.tint }]}>
                            <Text style={styles.tabBadgeText}>
                                {incomingQuery.data?.pages[0]?.totalElements}
                            </Text>
                        </View>
                    )}
                </Pressable>

                <Pressable
                    style={[
                        styles.tab,
                        activeTab === 'outgoing' && { borderBottomColor: colors.tint },
                    ]}
                    onPress={() => setActiveTab('outgoing')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'outgoing' ? colors.tint : colors.textSecondary },
                    ]}>
                        Lời mời đi
                    </Text>
                    {(outgoingQuery.data?.pages[0]?.totalElements ?? 0) > 0 && (
                        <View style={[styles.tabBadge, { backgroundColor: colors.textSecondary }]}>
                            <Text style={styles.tabBadgeText}>
                                {outgoingQuery.data?.pages[0]?.totalElements}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* Content */}
            {currentQuery.isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                </View>
            ) : (
                <FlashList<FriendRequestItemType>
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    estimatedItemSize={80}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    refreshControl={
                        <RefreshControl
                            refreshing={currentQuery.isRefetching && !currentQuery.isFetchingNextPage}
                            onRefresh={handleRefresh}
                            colors={[colors.tint]}
                            tintColor={colors.tint}
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        gap: Spacing.xs,
    },
    tabText: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
    },
    tabBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    tabBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing.lg,
    },
    emptyTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        marginBottom: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: Typography.sizes.base,
        textAlign: 'center',
    },
    footer: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
});
