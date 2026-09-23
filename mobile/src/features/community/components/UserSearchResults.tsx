import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { useSearchUsers } from '@/features/chat/hooks';
import type { UserSearchResult } from '@/features/chat/api';
import { EmptyState } from '@/shared/components/feedback';
import { Spinner } from '@/shared/components/ui';
import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { UserSearchResultItem } from './UserSearchResultItem';

interface UserSearchResultsProps {
    query: string;
    onUserSelect: (userId: number, relationshipStatus: UserSearchResult['relationshipStatus']) => void;
}

export function UserSearchResults({ query, onUserSelect }: UserSearchResultsProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const { data, isLoading, error } = useSearchUsers(query);

    const renderItem = ({ item }: { item: UserSearchResult }) => (
        <UserSearchResultItem user={item} onPress={onUserSelect} />
    );

    const keyExtractor = (item: UserSearchResult) => item.id.toString();

    if (isLoading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
                <Spinner size="lg" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
                <EmptyState
                    icon="❌"
                    title="Đã xảy ra lỗi"
                    message="Không thể tìm kiếm người dùng. Vui lòng thử lại."
                />
            </View>
        );
    }

    const users = data || [];

    if (users.length === 0 && query.length >= 2) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
                <EmptyState
                    icon="🔍"
                    title="Không tìm thấy kết quả"
                    message={`Không có người dùng nào với "${query}"`}
                />
            </View>
        );
    }

    return (
        <FlatList
            data={users}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={[styles.list, { backgroundColor: colors.backgroundSecondary }]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        />
    );
}

const styles = StyleSheet.create({
    list: {
        flex: 1,
    },
    listContent: {
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xl,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
