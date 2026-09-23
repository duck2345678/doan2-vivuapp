/**
 * PostActionRow Component
 * Unified action buttons row: Like, Comment, Share
 * 
 * Variants:
 * - compact: Icon + Count only (for feed/list views)
 * - full: Icon + Count + Label (for detail views)
 */

import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

export interface PostActionRowProps {
    // Required
    isLiked: boolean;
    onLikePress: () => void;
    onCommentPress: () => void;

    // Optional handlers
    onSharePress?: () => void;

    // Counts (optional)
    likesCount?: number;
    commentsCount?: number;
    sharesCount?: number;

    // Display options
    variant?: 'compact' | 'full';
    showBorder?: boolean;
    style?: ViewStyle;
}

/**
 * Reusable action row for posts
 * @param variant - 'compact' for feed views, 'full' for detail views
 */
export function PostActionRow({
    isLiked,
    onLikePress,
    onCommentPress,
    onSharePress,
    likesCount,
    commentsCount,
    sharesCount,
    variant = 'compact',
    showBorder = true,
    style,
}: PostActionRowProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const isCompact = variant === 'compact';
    const iconSize = isCompact ? 20 : 18;
    const likeColor = isLiked ? colors.heartLiked : colors.textSecondary;

    const containerStyle = [
        isCompact ? styles.containerCompact : styles.containerFull,
        showBorder && { borderTopColor: colors.chipBackground, borderTopWidth: 0.8 },
        style,
    ];

    const handleSharePress = () => {
        if (onSharePress) {
            onSharePress();
        }
    };

    return (
        <View style={containerStyle}>
            {/* Like Button */}
            <TouchableOpacity
                style={isCompact ? styles.actionButtonCompact : styles.actionButtonFull}
                onPress={onLikePress}
                activeOpacity={0.7}
                testID="like-button"
            >
                <MaterialIcons
                    name={isLiked ? 'favorite' : 'favorite-border'}
                    size={iconSize}
                    color={likeColor}
                />
                {likesCount !== undefined && (
                    <Text style={[isCompact ? styles.textCompact : styles.countText, { color: likeColor }]}>
                        {likesCount}
                    </Text>
                )}
                {!isCompact && (
                    <Text style={[styles.labelText, { color: likeColor }]}>Thích</Text>
                )}
            </TouchableOpacity>

            {/* Comment Button */}
            <TouchableOpacity
                style={isCompact ? styles.actionButtonCompact : styles.actionButtonFull}
                onPress={onCommentPress}
                activeOpacity={0.7}
                testID="comment-button"
            >
                <MaterialIcons
                    name="chat-bubble-outline"
                    size={iconSize}
                    color={colors.textSecondary}
                />
                {commentsCount !== undefined && (
                    <Text style={[isCompact ? styles.textCompact : styles.countText, { color: colors.textSecondary }]}>
                        {commentsCount}
                    </Text>
                )}
                {!isCompact && (
                    <Text style={[styles.labelText, { color: colors.textSecondary }]}>Bình luận</Text>
                )}
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity
                style={isCompact ? styles.actionButtonCompact : styles.actionButtonFull}
                onPress={handleSharePress}
                activeOpacity={0.7}
                testID="share-button"
            >
                <Ionicons
                    name="paper-plane-outline"
                    size={iconSize}
                    color={colors.textSecondary}
                />
                {sharesCount !== undefined && (
                    <Text style={[isCompact ? styles.textCompact : styles.countText, { color: colors.textSecondary }]}>
                        {sharesCount}
                    </Text>
                )}
                {!isCompact && (
                    <Text style={[styles.labelText, { color: colors.textSecondary }]}>Chia sẻ</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    // Compact variant (for feeds)
    containerCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.cardPadding,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.cardPadding,
        gap: 16,
    },
    actionButtonCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    textCompact: {
        fontSize: Typography.sizes.base, // 16px
        fontWeight: Typography.weights.normal,
        lineHeight: 24,
    },

    // Full variant (for detail views)
    containerFull: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    actionButtonFull: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md + 2,
        gap: 5,
    },
    countText: {
        fontSize: Typography.sizes['13'], // 13px
        fontWeight: Typography.weights.medium,
        lineHeight: 19.5,
    },
    labelText: {
        fontSize: Typography.sizes['13'], // 13px
        fontWeight: Typography.weights.normal,
        lineHeight: 19.5,
    },
});
