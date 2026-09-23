/**
 * ChooseChannelSheet Component
 * Bottom sheet for selecting a Channel when creating a post
 * Uses real API to fetch user's channels
 */

import { useChannelConversations } from '@/features/chat/hooks/useConversations';
import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { ConversationResponse } from '@/shared/types/backend.types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetFlatList,
    BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ChannelForSelection } from '../types/createPost.types';

export interface ChooseChannelSheetProps {
    onSelect: (channel: ChannelForSelection) => void;
}

/**
 * Map ConversationResponse to ChannelForSelection
 */
function mapConversationToChannel(conversation: ConversationResponse): ChannelForSelection {
    return {
        id: conversation.id || '',
        name: conversation.name || 'Channel',
        description: '',
        memberCount: 0, // Not available in ConversationResponse
        avatarUrl: conversation.avatarUrl,
        emoji: undefined,
        lastActive: formatLastActive(conversation.lastMessageTime),
    };
}

function formatLastActive(timestamp: string | undefined): string {
    if (!timestamp) return 'Chưa có hoạt động';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Hôm nay';
    } else if (diffDays === 1) {
        return 'Hôm qua';
    } else if (diffDays < 7) {
        return `${diffDays} ngày trước`;
    } else {
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
}

export const ChooseChannelSheet = forwardRef<BottomSheet, ChooseChannelSheetProps>(
    ({ onSelect }, ref) => {
        const colorScheme = useColorScheme() ?? 'light';
        const colors = Colors[colorScheme];
        const [searchQuery, setSearchQuery] = useState('');

        // Fetch user's channel conversations from API
        const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
            useChannelConversations({ size: 50 });

        const snapPoints = useMemo(() => ['70%', '90%'], []);

        const renderBackdrop = useCallback(
            (props: any) => (
                <BottomSheetBackdrop
                    {...props}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    opacity={0.5}
                />
            ),
            []
        );

        // Flatten paginated data and map to ChannelForSelection
        const channels = useMemo<ChannelForSelection[]>(() => {
            if (!data?.pages) return [];
            const allConversations = data.pages.flatMap((page) => page?.content ?? []);
            return allConversations.map(mapConversationToChannel);
        }, [data]);

        // Filter channels based on search query
        const filteredChannels = useMemo(() => {
            if (!searchQuery.trim()) return channels;
            const query = searchQuery.toLowerCase();
            return channels.filter((c) => c.name.toLowerCase().includes(query));
        }, [channels, searchQuery]);

        const handleSelect = (channel: ChannelForSelection) => {
            onSelect(channel);
        };

        const handleLoadMore = () => {
            if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        };

        const renderChannelItem = useCallback(
            ({ item }: { item: ChannelForSelection }) => (
                <TouchableOpacity
                    style={[styles.channelItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.channelLeft}>
                        {item.avatarUrl ? (
                            <Image
                                source={{ uri: item.avatarUrl }}
                                style={styles.channelAvatar}
                            />
                        ) : (
                            <View
                                style={[
                                    styles.channelIcon,
                                    { backgroundColor: colors.chipBackground },
                                ]}
                            >
                                <Text style={styles.channelEmoji}>
                                    {item.emoji || '#'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.channelInfo}>
                            <Text
                                style={[styles.channelName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                            >
                                {item.name}
                            </Text>
                            <Text
                                style={[styles.channelMeta, { color: colors.textSecondary }]}
                                numberOfLines={1}
                            >
                                {item.lastActive}
                            </Text>
                        </View>
                    </View>
                    <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>
            ),
            [colors, handleSelect]
        );

        const renderFooter = () => {
            if (!isFetchingNextPage) return null;
            return (
                <View style={styles.loadingFooter}>
                    <ActivityIndicator size="small" color={colors.actionBlue} />
                </View>
            );
        };

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={[styles.background, { backgroundColor: colors.background }]}
                handleIndicatorStyle={[styles.indicator, { backgroundColor: colors.border }]}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        Chọn Channel
                    </Text>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <View
                        style={[
                            styles.searchInputContainer,
                            {
                                backgroundColor: colors.chipBackground,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                        <BottomSheetTextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Tìm Channel…"
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Channel List */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.actionBlue} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Đang tải Channel...
                        </Text>
                    </View>
                ) : (
                    <BottomSheetFlatList<ChannelForSelection>
                        data={filteredChannels}
                        keyExtractor={(item: ChannelForSelection) => item.id}
                        renderItem={renderChannelItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialIcons
                                    name="group"
                                    size={48}
                                    color={colors.textSecondary}
                                />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    {searchQuery
                                        ? 'Không tìm thấy Channel'
                                        : 'Bạn chưa tham gia Channel nào'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </BottomSheet>
        );
    }
);

ChooseChannelSheet.displayName = 'ChooseChannelSheet';

const styles = StyleSheet.create({
    background: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
    },
    indicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        paddingHorizontal: Spacing.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        textAlign: 'center',
    },
    searchContainer: {
        paddingHorizontal: Spacing.screenPadding,
        paddingVertical: Spacing.sm,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm + 4,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.sizes.base,
        paddingVertical: 0,
    },
    listContent: {
        paddingBottom: Spacing.xl,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.screenPadding,
        paddingVertical: Spacing.sm + 4,
        borderBottomWidth: 1,
    },
    channelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: Spacing.sm + 4,
    },
    channelAvatar: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
    },
    channelIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelEmoji: {
        fontSize: 20,
    },
    channelInfo: {
        flex: 1,
    },
    channelName: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        marginBottom: 2,
    },
    channelMeta: {
        fontSize: Typography.sizes.sm,
    },
    emptyContainer: {
        paddingVertical: Spacing.xl * 2,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    emptyText: {
        fontSize: Typography.sizes.base,
        textAlign: 'center',
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
    loadingFooter: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
});
