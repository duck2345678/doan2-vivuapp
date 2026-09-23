import React, { memo } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors } from '@/shared/constants/theme';
import { Typography } from '@/shared/constants/typography';
import { useColorScheme } from '@/shared/hooks/useColorScheme';
import type { Review } from '../types';

interface ReviewsListProps {
    reviews: Review[];
    colorScheme?: 'light' | 'dark';
}

export const ReviewsList = memo(function ReviewsList({
    reviews,
    colorScheme = 'light',
}: ReviewsListProps) {
    const colors = Colors[colorScheme];

    if (!reviews || reviews.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.text }]}>
                Đánh giá ({reviews.length})
            </Text>

            <View style={styles.list}>
                {reviews.map((review, index) => (
                    <View
                        key={review.id}
                        style={[
                            styles.reviewItem,
                            index !== reviews.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                        ]}
                    >
                        <View style={styles.header}>
                            {/* Avatar placeholder or image */}
                            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                                {review.authorPhoto ? (
                                    <Image source={{ uri: review.authorPhoto }} style={styles.avatarImage} />
                                ) : (
                                    <MaterialIcons name="person" size={24} color={colors.icon} />
                                )}
                            </View>

                            <View style={styles.headerInfo}>
                                <Text style={[styles.authorName, { color: colors.text }]}>
                                    {review.authorName}
                                </Text>
                                <View style={styles.ratingRow}>
                                    <View style={styles.stars}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <MaterialIcons
                                                key={star}
                                                name={star <= review.rating ? "star" : "star-border"}
                                                size={14}
                                                color="#FBBF24"
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.timeText, { color: colors.icon }]}>
                                        • {review.relativeTimeDescription}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <Text style={[styles.reviewText, { color: colors.text }]}>
                            {review.text}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold as any,
        marginBottom: Spacing.md,
    },
    list: {
        gap: Spacing.md,
    },
    reviewItem: {
        paddingBottom: Spacing.md,
        marginBottom: Spacing.xs,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    headerInfo: {
        flex: 1,
    },
    authorName: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.medium as any,
        marginBottom: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stars: {
        flexDirection: 'row',
        marginRight: Spacing.xs,
    },
    timeText: {
        fontSize: Typography.sizes.xs,
    },
    reviewText: {
        fontSize: Typography.sizes.sm,
        lineHeight: 20,
    },
});
