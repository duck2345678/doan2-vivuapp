import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme, useDebounce } from '@/shared/hooks';
import { LoadingScreen, EmptyState } from '@/shared/components/feedback';
import { useSearchMessages } from '../hooks';
import { HighlightedText } from '../components/HighlightedText';

// Calculated height for each item:
// padding (16*2) + marginBottom (4) + senderName (16) + content (20) + border (1) = 73
const ITEM_HEIGHT = 73;

export function MessageSearchScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const params = useLocalSearchParams<{ conversationId: string }>();
    const conversationId = params.conversationId || '';

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const { data, isLoading, fetchNextPage, hasNextPage } = useSearchMessages(
        debouncedSearch.length >= 2
            ? { conversationId, keyword: debouncedSearch }
            : undefined
    );

    const results = data?.pages.flatMap((p) => p.content) ?? [];

    const handleResultPress = (messageId: number) => {
        router.back();
    };

    const getItemLayout = (data: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </Pressable>

                <View style={[styles.searchContainer, { backgroundColor: colors.chipBackground }]}>
                    <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Tìm kiếm tin nhắn..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                        </Pressable>
                    )}
                </View>
            </View>

            {isLoading && <LoadingScreen message="Đang tìm kiếm..." />}

            {!isLoading && searchQuery.length < 2 && (
                <EmptyState
                    icon="search"
                    title="Tìm kiếm tin nhắn"
                    message="Nhập ít nhất 2 ký tự để tìm kiếm"
                />
            )}

            {!isLoading && searchQuery.length >= 2 && results.length === 0 && (
                <EmptyState
                    icon="search-off"
                    title="Không tìm thấy"
                    message={`Không có tin nhắn nào chứa "${searchQuery}"`}
                />
            )}

            {results.length > 0 && (
                <FlatList
                    data={results}
                    keyExtractor={(item) => String(item.id)}
                    getItemLayout={getItemLayout}
                    renderItem={({ item }) => (
                        <Pressable
                            style={[styles.resultItem, { borderBottomColor: colors.border }]}
                            onPress={() => handleResultPress(item.id)}
                        >
                            <View style={styles.resultHeader}>
                                <Text style={[styles.senderName, { color: colors.text }]}>
                                    {item.senderName}
                                </Text>
                                <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                                    {new Date(item.timestamp).toLocaleDateString('vi-VN')}
                                </Text>
                            </View>
                            <HighlightedText
                                text={item.content || ''}
                                searchTerm={debouncedSearch}
                                style={[styles.content, { color: colors.textSecondary }]}
                            />
                        </Pressable>
                    )}
                    onEndReached={() => hasNextPage && fetchNextPage()}
                    onEndReachedThreshold={0.5}
                />
            )}
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
        padding: Spacing.sm,
        borderBottomWidth: 1,
        gap: Spacing.sm,
    },
    backButton: {
        padding: Spacing.xs,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 20,
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    resultItem: {
        padding: Spacing.md,
        borderBottomWidth: 1,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    senderName: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
    },
    timestamp: {
        fontSize: Typography.sizes.sm,
    },
    content: {
        fontSize: Typography.sizes.base,
        lineHeight: 20,
    },
});
