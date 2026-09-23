import { Href, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { useItineraries } from '@/features/itinerary/hooks/useItineraries';
import type { Itinerary } from '@/features/itinerary/types/itinerary.types';
import { EmptyState } from '@/shared/components/feedback';
import { Spinner } from '@/shared/components/ui';
import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { ItineraryListCard } from './ItineraryListCard';

interface ItineraryListProps {
    searchQuery: string;
}

/**
 * FlatList of itineraries for the community tab
 */
export function ItineraryList({ searchQuery }: ItineraryListProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const router = useRouter();

    const { itineraries, loading, error, reload } = useItineraries();

    const handleItineraryPress = (itinerary: Itinerary) => {
        router.push(`/itinerary/${itinerary.id}` as Href);
    };

    // Filter by search query
    const filteredItineraries = useMemo(
        () =>
            itineraries.filter((item) =>
                searchQuery
                    ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.locations?.some((loc) =>
                          loc.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : true
            ),
        [itineraries, searchQuery]
    );

    const renderItem = ({ item }: { item: Itinerary }) => (
        <ItineraryListCard itinerary={item} onPress={handleItineraryPress} />
    );

    const keyExtractor = (item: Itinerary) => item.id;

    if (loading) {
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
                    message="Không thể tải lịch trình. Vui lòng thử lại."
                    actionLabel="Thử lại"
                    onAction={reload}
                />
            </View>
        );
    }

    if (filteredItineraries.length === 0) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
                <EmptyState
                    icon="📅"
                    title={searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có lịch trình'}
                    message={
                        searchQuery
                            ? 'Thử tìm kiếm với từ khóa khác'
                            : 'Tạo lịch trình mới để chia sẻ cùng cộng đồng!'
                    }
                />
            </View>
        );
    }

    return (
        <FlatList
            data={filteredItineraries}
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
        paddingBottom: 100,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
