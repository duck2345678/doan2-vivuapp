/**
 * ProfileEmptyPostCard Component
 * Empty state card shown when user has no posts
 */

import { Button, Card } from '@/shared/components/ui';
import { Colors } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ms, s, vs } from 'react-native-size-matters';

interface ProfileEmptyPostCardProps {
    onCreatePost?: () => void;
}

export function ProfileEmptyPostCard({ onCreatePost }: ProfileEmptyPostCardProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={styles.container}>
            <Card variant="elevated" padding="lg" style={styles.card}>
                {/* Icon in soft circle */}
                <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
                    <MaterialIcons name="edit" size={ms(28)} color={colors.tint} />
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: colors.text }]}>
                    Đăng bài viết
                </Text>

                {/* Subtitle */}
                <Text style={[styles.subtitle, { color: colors.icon }]}>
                    Chia sẻ những suy nghĩ hoặc hoạt động gần đây.
                </Text>

                {/* CTA Button */}
                <Button
                    title="Đăng"
                    variant="primary"
                    size="md"
                    fullWidth
                    onPress={onCreatePost}
                    style={styles.button}
                />
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: s(16),
        paddingVertical: vs(24),
    },
    card: {
        alignItems: 'center',
    },
    iconContainer: {
        width: s(64),
        height: s(64),
        borderRadius: ms(32),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: vs(16),
    },
    title: {
        fontSize: ms(18),
        fontWeight: '600',
        marginBottom: vs(4),
        textAlign: 'center',
    },
    subtitle: {
        fontSize: ms(14),
        fontWeight: '400',
        textAlign: 'center',
        marginBottom: vs(24),
        lineHeight: ms(21),
    },
    button: {
        marginTop: vs(4),
    },
});
